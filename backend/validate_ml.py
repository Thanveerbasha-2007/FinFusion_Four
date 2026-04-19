"""
Validation test: simulate PhonePe statement data and run the full ML pipeline.
Tests the exact transaction format visible in the user's PDF screenshot.
"""
import sys, os
sys.path.insert(0, ".")

import pandas as pd
from datetime import datetime, timezone
from app.services.pipeline_service import extract_features
from app.ml.personality_classifier import personality_classifier
from app.ml.credit_scorer import credit_scorer
from app.ml.prediction_engine import prediction_engine

# ── Simulate the exact PhonePe transactions from the screenshot ───────────────
# The PDF shows 30 days of data (19 Mar – 18 Apr 2026)
PHONEPE_TXNS = [
    # From the screenshot:
    {"date": "2026-04-18T22:45:00", "description": "Payment to Google",        "amount": 2.0,    "type": "debit",  "category": "utilities", "mode": "UPI"},
    {"date": "2026-04-18T01:19:00", "description": "Paid to BUSAM MANEESH",    "amount": 27.7,   "type": "debit",  "category": "transfer",  "mode": "UPI"},
    {"date": "2026-04-18T00:33:00", "description": "Received from *****1031",  "amount": 1.0,    "type": "credit", "category": "transfer",  "mode": "UPI"},
    {"date": "2026-04-18T00:31:00", "description": "Paid to ROUTULA VENKATA",  "amount": 155.0,  "type": "debit",  "category": "transfer",  "mode": "UPI"},
    {"date": "2026-04-17T22:00:00", "description": "Paid to Amruth Sai IIITL", "amount": 60.0,   "type": "debit",  "category": "transfer",  "mode": "UPI"},
    {"date": "2026-04-17T14:14:00", "description": "Received from Akshay",     "amount": 70.0,   "type": "credit", "category": "transfer",  "mode": "UPI"},
    {"date": "2026-04-17T13:50:00", "description": "Transfer to XXXX1272",     "amount": 500.0,  "type": "debit",  "category": "transfer",  "mode": "UPI"},
    # Additional realistic PhonePe transactions for the month
    {"date": "2026-04-15T10:00:00", "description": "Zomato order",             "amount": 249.0,  "type": "debit",  "category": "dining",    "mode": "UPI"},
    {"date": "2026-04-14T14:00:00", "description": "Amazon shopping",          "amount": 1299.0, "type": "debit",  "category": "shopping",  "mode": "UPI"},
    {"date": "2026-04-13T09:00:00", "description": "Airtel recharge",          "amount": 299.0,  "type": "debit",  "category": "utilities", "mode": "UPI"},
    {"date": "2026-04-12T18:00:00", "description": "Swiggy food",              "amount": 189.0,  "type": "debit",  "category": "dining",    "mode": "UPI"},
    {"date": "2026-04-10T11:00:00", "description": "Petrol station",           "amount": 450.0,  "type": "debit",  "category": "transportation", "mode": "UPI"},
    {"date": "2026-04-08T08:00:00", "description": "Netflix subscription",     "amount": 649.0,  "type": "debit",  "category": "entertainment","mode": "CARD"},
    {"date": "2026-04-05T12:00:00", "description": "BigBasket groceries",      "amount": 852.0,  "type": "debit",  "category": "groceries", "mode": "UPI"},
    {"date": "2026-04-01T10:00:00", "description": "SALARY CREDIT",            "amount": 25000.0,"type": "credit", "category": "income",    "mode": "NEFT"},
    {"date": "2026-03-28T16:00:00", "description": "Electricity bill BESCOM",  "amount": 735.0,  "type": "debit",  "category": "utilities", "mode": "UPI"},
    {"date": "2026-03-25T14:00:00", "description": "Received from Akshay",     "amount": 500.0,  "type": "credit", "category": "transfer",  "mode": "UPI"},
    {"date": "2026-03-22T11:00:00", "description": "OLA ride",                 "amount": 87.0,   "type": "debit",  "category": "transportation","mode":"UPI"},
    {"date": "2026-03-20T19:00:00", "description": "Zomato order",             "amount": 320.0,  "type": "debit",  "category": "dining",    "mode": "UPI"},
    {"date": "2026-03-19T09:00:00", "description": "Paid to BUSAM MANEESH",    "amount": 50.0,   "type": "debit",  "category": "transfer",  "mode": "UPI"},
]

df = pd.DataFrame(PHONEPE_TXNS)
df["date"] = pd.to_datetime(df["date"])
df["amount"] = df["amount"].astype(float)

print("=" * 60)
print("PhonePe ML Pipeline Validation Test")
print("=" * 60)
print(f"Transactions: {len(df)}")
print(f"Credits: {len(df[df['type']=='credit'])}  |  Debits: {len(df[df['type']=='debit'])}")
print()

# Feature extraction
features = extract_features(df)
print("── Extracted Features ───────────────────────────────────")
print(f"  Total Income:      ₹{features['total_income']:,.1f}")
print(f"  Total Spent:       ₹{features['total_spent']:,.1f}")
print(f"  Net Savings:       ₹{features['net_savings']:,.1f}")
print(f"  Savings Rate:      {features['savings_rate']*100:.1f}%")
print(f"  Monthly Income:    ₹{features['monthly_income']:,.0f}")
print(f"  Monthly Spent:     ₹{features['monthly_spent']:,.0f}")
print(f"  Transactions:      {features['txn_count']} ({features['date_range_days']} days)")
print(f"  Freq/day:          {features['freq_daily']:.2f}")
print(f"  UPI Ratio:         {features['upi_ratio']*100:.0f}%")
print(f"  Impulse Ratio:     {features['impulse_ratio']*100:.0f}%")
print(f"  Consistency Score: {features['consistency_score']*100:.0f}%")
print(f"  Income Stability:  {features['income_stability']*100:.0f}%")
print(f"  Category Spend:    {features['category_spend']}")
print()

# Personality
persona = personality_classifier.classify(features)
print("── Personality Classification ───────────────────────────")
print(f"  Persona:   {persona['persona']}")
print(f"  Risk:      {persona['risk']}")
print(f"  Spend%:    {persona['spending_ratio']}%")
print()

# Credit score
scoring = credit_scorer.calculate(features)
print("── Credit Score ─────────────────────────────────────────")
print(f"  Score:  {scoring['score']}  ({scoring['grade']})")
for dim, v in scoring["breakdown"].items():
    print(f"  {dim:22s}  {v['score']:3d}/100  (weight {v['weight']*100:.0f}%)")
print()

# Predictions
preds = prediction_engine.predict(features, persona, scoring["score"])
print("── Predictions ──────────────────────────────────────────")
print(f"  Next Month Spend:  ₹{preds['next_month_spending']:,}")
print(f"  Risk Probability:  {preds['risk_probability']}%")
print(f"  Savings Potential: ₹{preds['savings_potential']:,}")
print()

# Recommendations
recs = prediction_engine.recommend(features, persona, scoring["score"])
print("── Recommendations ──────────────────────────────────────")
for i, r in enumerate(recs, 1):
    print(f"  {i}. {r[:90]}")

print()
print("=" * 60)
print("  VALIDATION COMPLETE")
print("=" * 60)
