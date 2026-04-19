from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Transactions ─────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    date: datetime
    description: str
    amount: float
    type: str       # 'credit' | 'debit'
    category: Optional[str] = "other"
    mode: Optional[str] = "BANK"


class TransactionOut(BaseModel):
    id: int
    date: datetime
    description: str
    amount: float
    type: str
    category: str
    mode: str

    model_config = {"from_attributes": True}


class BulkTransactionCreate(BaseModel):
    transactions: List[TransactionCreate]


# ─── Analytics / AI ──────────────────────────────────────────────────
class CreditScoreOut(BaseModel):
    score: int
    grade: str
    persona: str
    risk_level: str
    breakdown: Dict[str, Any]
    recommendations: List[str]
    predictions: Dict[str, Any]
    computed_at: datetime

    model_config = {"from_attributes": True}


class DashboardResponse(BaseModel):
    user: UserOut
    credit_score: Optional[CreditScoreOut]
    features: Optional[Dict[str, Any]]
    recent_transactions: List[TransactionOut]
