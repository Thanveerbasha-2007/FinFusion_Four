from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import JSON
from app.database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete")
    credit_scores = relationship("CreditScore", back_populates="owner", cascade="all, delete")
    financial_profiles = relationship("FinancialProfile", back_populates="owner", cascade="all, delete")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(String)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)   # 'credit' | 'debit'
    category = Column(String, default="other")
    mode = Column(String, default="BANK")  # 'UPI' | 'BANK' | 'CARD'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="transactions")


class CreditScore(Base):
    __tablename__ = "credit_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    grade = Column(String)
    persona = Column(String)
    risk_level = Column(String)
    breakdown = Column(JSON)
    recommendations = Column(JSON)
    predictions = Column(JSON)
    computed_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="credit_scores")


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_income = Column(Float, default=0)
    total_spent = Column(Float, default=0)
    txn_count = Column(Integer, default=0)
    avg_txn_size = Column(Float, default=0)
    freq_daily = Column(Float, default=0)
    upi_ratio = Column(Float, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="financial_profiles")
