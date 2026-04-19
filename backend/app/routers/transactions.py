from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Transaction
from app.models.schemas import TransactionCreate, TransactionOut, BulkTransactionCreate
from app.routers.auth import get_current_user
from app.models.models import User
import datetime

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=TransactionOut)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = Transaction(user_id=current_user.id, **body.model_dump())
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.post("/bulk", response_model=List[TransactionOut])
def bulk_create(
    body: BulkTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = [Transaction(user_id=current_user.id, **t.model_dump()) for t in body.transactions]
    db.add_all(txns)
    db.commit()
    for t in txns:
        db.refresh(t)
    return txns


@router.delete("/{txn_id}")
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = db.query(Transaction).filter(
        Transaction.id == txn_id, Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return {"message": "Deleted"}
