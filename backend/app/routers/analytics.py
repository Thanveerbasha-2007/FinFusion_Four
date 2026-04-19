from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Transaction, CreditScore, FinancialProfile
from app.models.schemas import DashboardResponse
from app.routers.auth import get_current_user
from app.services.pipeline_service import run_pipeline, extract_features
from app.services.parser import parse_bank_statement
import os
import re
import datetime

router = APIRouter(prefix="/analytics", tags=["analytics"])

# 50 MB hard cap — enforced in code (uvicorn allows the bytes through,
# we reject after counting)
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cs = (
        db.query(CreditScore)
        .filter(CreditScore.user_id == current_user.id)
        .order_by(CreditScore.computed_at.desc())
        .first()
    )
    recent_txns = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
        .limit(20)
        .all()
    )
    all_txns = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )
    features = None
    if all_txns:
        import pandas as pd
        rows = [
            {
                "date":     t.date,
                "amount":   t.amount,
                "type":     t.type,
                "mode":     t.mode,
                "category": t.category or "other",
            }
            for t in all_txns
        ]
        df = pd.DataFrame(rows)
        features = extract_features(df)

    return {
        "user":                current_user,
        "credit_score":        cs,
        "features":            features,
        "recent_transactions": recent_txns,
    }


# ─── Analyze ─────────────────────────────────────────────────────────────────

@router.post("/analyze")
def analyze(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = run_pipeline(db, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return JSONResponse({
        "status":       "success",
        "credit_score": result["credit_score"].score,
        "grade":        result["credit_score"].grade,
        "persona":      result["persona"],
        "message":      "Analysis complete!",
    })


# ─── Upload PDF ───────────────────────────────────────────────────────────────

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Use a safe temp path (no spaces in filename to avoid shell issues)
    safe_name = re.sub(r'[^\w.]', '_', file.filename)
    tmp_path  = f"tmp_uid{current_user.id}_{safe_name}"

    try:
        # ── Stream-read in 512 KB chunks, enforcing 50 MB cap ─────────────────
        total_bytes = 0
        with open(tmp_path, "wb") as buf:
            while True:
                chunk = await file.read(524288)   # 512 KB per chunk
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    buf.close()
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large ({total_bytes // (1024*1024)} MB). "
                               f"Maximum allowed size is 50 MB."
                    )
                buf.write(chunk)

        # ── Parse the PDF ──────────────────────────────────────────────────────
        try:
            df = parse_bank_statement(tmp_path)
        except Exception as parse_err:
            raise HTTPException(
                status_code=422,
                detail=f"PDF parsing error: {str(parse_err)}. "
                       "Ensure the file is a text-based (not scanned) PDF."
            )

        if df is None or df.empty:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No transactions could be extracted. "
                    "Supported banks: Canara, PhonePe, HDFC, SBI, ICICI, Axis. "
                    "Make sure the PDF is text-based (not a scanned image)."
                )
            )

        bank_detected = df.attrs.get("bank", "Unknown")

        # ── Wipe ALL previous data for this user ───────────────────────────────
        # This guarantees no stale data on re-upload.
        db.query(Transaction).filter(Transaction.user_id == current_user.id).delete(
            synchronize_session=False
        )
        db.query(CreditScore).filter(CreditScore.user_id == current_user.id).delete(
            synchronize_session=False
        )
        db.query(FinancialProfile).filter(FinancialProfile.user_id == current_user.id).delete(
            synchronize_session=False
        )
        db.commit()

        # ── Insert fresh transactions in bulk ──────────────────────────────────
        new_txns = []
        for _, row in df.iterrows():
            raw_date = row.get("date")
            if hasattr(raw_date, "to_pydatetime"):
                txn_date = raw_date.to_pydatetime().replace(tzinfo=None)
            elif isinstance(raw_date, datetime.datetime):
                txn_date = raw_date.replace(tzinfo=None)
            else:
                txn_date = datetime.datetime.utcnow()

            new_txns.append(Transaction(
                user_id     = current_user.id,
                date        = txn_date,
                description = str(row.get("description", ""))[:255],
                amount      = float(row["amount"]),
                type        = str(row.get("type", "debit")),
                category    = str(row.get("category", "other")),
                mode        = str(row.get("mode", "BANK")),
            ))

        db.bulk_save_objects(new_txns)
        db.commit()

        # ── Run ML pipeline ────────────────────────────────────────────────────
        result = run_pipeline(db, current_user.id)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return JSONResponse({
            "status":             "success",
            "bank_detected":      bank_detected,
            "transactions_added": len(new_txns),
            "credit_score":       result["credit_score"].score,
            "grade":              result["credit_score"].grade,
            "persona":            result["persona"]["persona"],
            "advice":             result["persona"]["advice"],
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


