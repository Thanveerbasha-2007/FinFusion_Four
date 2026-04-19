"""
Demo seed script — generates realistic 3-month transaction history for a user.
Usage: python seed_demo.py <user_id>
"""

import sys
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.models import Base, User, Transaction
from app.services.auth_service import get_password_hash
from app.services.pipeline_service import run_pipeline

Base.metadata.create_all(bind=engine)

CATEGORIES = ["groceries","dining","shopping","transportation","entertainment","utilities","other"]
MODES      = ["UPI","UPI","UPI","CARD","BANK","NEFT"]

SAMPLE_DESCS = {
    "groceries":     ["BigBasket order","DMart groceries","Kirana shop","JioMart"],
    "dining":        ["Zomato order","Swiggy food","Restaurant bill","Cafe Coffee Day"],
    "shopping":      ["Amazon purchase","Flipkart order","Myntra clothes","Meesho"],
    "transportation":["Ola cab","Uber ride","Petrol bunk","Metro recharge","Rapido"],
    "entertainment": ["Netflix subscription","BookMyShow","Hotstar","Spotify"],
    "utilities":     ["Electricity bill","Airtel recharge","BSNL broadband","Water bill"],
    "other":         ["ATM withdrawal","Transfer","Miscellaneous","Payment"],
}


def seed(user_id: int):
    db: Session = SessionLocal()
    now = datetime.utcnow()
    txns = []

    # Monthly salary credits
    for m in range(3):
        txns.append(Transaction(
            user_id     = user_id,
            date        = now - timedelta(days=90 - m * 30),
            description = "SALARY CREDIT - Employer",
            amount      = random.uniform(35000, 65000),
            type        = "credit",
            category    = "income",
            mode        = "NEFT",
        ))

    # Random daily spends
    for i in range(90):
        n_per_day = random.choices([0, 1, 2, 3], weights=[20, 40, 30, 10])[0]
        for _ in range(n_per_day):
            cat  = random.choice(CATEGORIES)
            desc = random.choice(SAMPLE_DESCS[cat])
            mode = random.choice(MODES)
            if "UPI" in desc or cat in ["dining","groceries","shopping"]:
                mode = "UPI"
            txns.append(Transaction(
                user_id     = user_id,
                date        = now - timedelta(days=90 - i, hours=random.randint(0, 23)),
                description = desc,
                amount      = random.uniform(50, 3500),
                type        = "debit",
                category    = cat,
                mode        = mode,
            ))

    db.add_all(txns)
    db.commit()
    print(f"✅ Seeded {len(txns)} transactions for user {user_id}")

    result = run_pipeline(db, user_id)
    print(f"🎯 Score: {result['credit_score'].score} | Persona: {result['persona']['persona']}")
    db.close()


if __name__ == "__main__":
    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    seed(uid)
