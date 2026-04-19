"""
ML Pipeline Service
Orchestrates: Feature Engineering → Personality → Credit Score → Predictions → Recommendations
Persists results to database.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.models import Transaction, CreditScore, FinancialProfile
from app.ml.personality_classifier import personality_classifier
from app.ml.credit_scorer import credit_scorer
from app.ml.prediction_engine import prediction_engine
import datetime


# ─── Feature Engineering ─────────────────────────────────────────────────────

def extract_features(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Rich feature extraction from raw transaction DataFrame.
    Handles real PhonePe / bank data patterns accurately.
    """
    df = df.copy()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["date"]   = pd.to_datetime(df["date"],   errors="coerce")
    df = df.dropna(subset=["date"])
    df = df[df["amount"] > 0]

    if df.empty:
        return _empty_features()

    credits = df[df["type"] == "credit"]
    debits  = df[df["type"] == "debit"]

    total_income = float(credits["amount"].sum())
    total_spent  = float(debits["amount"].sum())
    txn_count    = int(len(df))
    credit_count = int(len(credits))
    debit_count  = int(len(debits))

    # Date range in days (at least 1)
    date_range = max((df["date"].max() - df["date"].min()).days, 1)
    freq_daily = txn_count / date_range

    # Monthly averages (annualize if < 1 month data)
    months_covered = max(date_range / 30.0, 1.0)
    monthly_income = total_income / months_covered
    monthly_spent  = total_spent  / months_covered

    # Savings metrics
    net_savings       = total_income - total_spent
    savings_rate      = net_savings / max(total_income, 1)
    monthly_savings   = net_savings / months_covered

    # Transaction size analysis
    avg_txn_size    = float(df["amount"].mean())
    median_txn      = float(df["amount"].median())
    max_single_txn  = float(df["amount"].max())
    std_txn         = float(df["amount"].std()) if txn_count > 1 else 0.0

    # Mode breakdown
    mode_counts  = df["mode"].value_counts()
    upi_count    = int(mode_counts.get("UPI", 0))
    neft_count   = int(mode_counts.get("NEFT", 0))
    card_count   = int(mode_counts.get("CARD", 0))
    upi_ratio    = upi_count / max(txn_count, 1)
    digital_ratio = (upi_count + card_count + neft_count) / max(txn_count, 1)

    # Category breakdown (spend only)
    cat_spend: Dict[str, float] = {}
    for cat, grp in debits.groupby("category"):
        cat_spend[str(cat)] = float(grp["amount"].sum())

    # Consistency: standard deviation of daily spend (lower = more consistent)
    daily_debit = debits.groupby(debits["date"].dt.date)["amount"].sum()
    spend_volatility = float(daily_debit.std()) if len(daily_debit) > 1 else 0.0
    consistency_score = max(0, 1 - (spend_volatility / max(monthly_spent, 1)) * 0.5)

    # Impulse buying signals: transactions < ₹200 that are not utilities
    small_debits = debits[(debits["amount"] < 200) & (~debits["category"].isin(["utilities", "income"]))]
    impulse_ratio = len(small_debits) / max(debit_count, 1)

    # Large spend events (> 5000) 
    large_txns = debits[debits["amount"] > 5000]
    large_txn_count = int(len(large_txns))

    # Recurring payment detection (same amount appearing 2+ times)
    recurring = debits.groupby("amount").filter(lambda x: len(x) >= 2)
    recurring_amount = float(recurring["amount"].sum())

    # Income stability: measure variance only on SALARY / real income credits (not P2P transfers)
    income_credits = credits[credits["category"].isin(["income"])] if "category" in credits.columns else credits
    if income_credits.empty:
        income_credits = credits  # fallback: use all credits
    if len(income_credits) >= 2:
        income_cv = income_credits["amount"].std() / max(income_credits["amount"].mean(), 1)
        income_stability = max(0, 1 - income_cv)
    elif len(income_credits) == 1:
        income_stability = 0.75   # single salary → reasonably stable, not perfect
    else:
        income_stability = 0.3

    return {
        # Core financials
        "total_income":      total_income,
        "total_spent":       total_spent,
        "net_savings":       net_savings,
        "savings_rate":      round(savings_rate, 4),
        "monthly_income":    round(monthly_income, 2),
        "monthly_spent":     round(monthly_spent, 2),
        "monthly_savings":   round(monthly_savings, 2),
        # Transaction counts
        "txn_count":         txn_count,
        "credit_count":      credit_count,
        "debit_count":       debit_count,
        # Transaction sizes
        "avg_txn_size":      round(avg_txn_size, 2),
        "median_txn":        round(median_txn, 2),
        "max_single_txn":    round(max_single_txn, 2),
        "std_txn":           round(std_txn, 2),
        # Frequency
        "freq_daily":        round(freq_daily, 3),
        "date_range_days":   date_range,
        "months_covered":    round(months_covered, 2),
        # Mode ratios
        "upi_ratio":         round(upi_ratio, 3),
        "digital_ratio":     round(digital_ratio, 3),
        "upi_count":         upi_count,
        "neft_count":        neft_count,
        "card_count":        card_count,
        # Behaviour signals
        "consistency_score": round(consistency_score, 3),
        "impulse_ratio":     round(impulse_ratio, 3),
        "spend_volatility":  round(spend_volatility, 2),
        "income_stability":  round(income_stability, 3),
        "large_txn_count":   large_txn_count,
        "recurring_amount":  round(recurring_amount, 2),
        # Category breakdown (spend)
        "category_spend":    cat_spend,
        # Actual monthly trend data
        "monthly_breakdown": _calculate_monthly_breakdown(df),
    }

def _calculate_monthly_breakdown(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    
    df = df.copy()
    # Ensure date is sorted
    df = df.sort_values("date")
    
    df["month_period"] = df["date"].dt.to_period("M")
    
    # Group by month and calculate income/spending
    monthly_data = []
    for period, group in df.groupby("month_period"):
        inc = float(group[group["type"] == "credit"]["amount"].sum())
        spd = float(group[group["type"] == "debit"]["amount"].sum())
        monthly_data.append({
            "month": period.strftime("%b %y"),
            "income": round(inc, 2),
            "spending": round(spd, 2)
        })
    
    return monthly_data


def _empty_features() -> Dict[str, Any]:
    return {
        "total_income": 0, "total_spent": 0, "net_savings": 0,
        "savings_rate": 0, "monthly_income": 0, "monthly_spent": 0, "monthly_savings": 0,
        "txn_count": 0, "credit_count": 0, "debit_count": 0,
        "avg_txn_size": 0, "median_txn": 0, "max_single_txn": 0, "std_txn": 0,
        "freq_daily": 0, "date_range_days": 0, "months_covered": 0,
        "upi_ratio": 0, "digital_ratio": 0, "upi_count": 0, "neft_count": 0, "card_count": 0,
        "consistency_score": 0, "impulse_ratio": 0, "spend_volatility": 0,
        "income_stability": 0, "large_txn_count": 0, "recurring_amount": 0,
        "category_spend": {},
        "monthly_breakdown": [],
    }


def features_from_db(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txns:
        return None
    rows = [{
        "date":     t.date,
        "amount":   t.amount,
        "type":     t.type,
        "mode":     t.mode,
        "category": t.category,
    } for t in txns]
    df = pd.DataFrame(rows)
    return extract_features(df)


# ─── Pipeline ─────────────────────────────────────────────────────────────────

def run_pipeline(db: Session, user_id: int) -> Dict[str, Any]:
    features = features_from_db(db, user_id)
    if not features:
        return {"error": "No transactions found. Add transactions first."}

    persona  = personality_classifier.classify(features)
    scoring  = credit_scorer.calculate(features)
    preds    = prediction_engine.predict(features, persona)
    recs     = prediction_engine.recommend(features, persona, scoring["score"])

    # Persist credit score
    existing = db.query(CreditScore).filter(CreditScore.user_id == user_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    cs = CreditScore(
        user_id         = user_id,
        score           = scoring["score"],
        grade           = scoring["grade"],
        persona         = persona["persona"],
        risk_level      = persona["risk"],
        breakdown       = scoring["breakdown"],
        recommendations = recs,
        predictions     = preds,
        computed_at     = datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(cs)

    # Persist financial profile
    prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not prof:
        prof = FinancialProfile(user_id=user_id)
        db.add(prof)

    prof.total_income  = features["total_income"]
    prof.total_spent   = features["total_spent"]
    prof.txn_count     = features["txn_count"]
    prof.avg_txn_size  = features["avg_txn_size"]
    prof.freq_daily    = features["freq_daily"]
    prof.upi_ratio     = features["upi_ratio"]
    prof.updated_at    = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(cs)

    return {
        "credit_score": cs,
        "features":     features,
        "persona":      persona,
    }
