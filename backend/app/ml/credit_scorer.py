"""
Credit Scoring Engine — Accurate Behavioral Credit Scoring (300–900)
Uses 6 weighted dimensions derived from real transaction features.
Each dimension is calibrated to real spending patterns.
"""

import numpy as np
from typing import Dict, Any


# Weights must sum to 1.0
WEIGHTS = {
    "savings_rate":       0.30,  # Most important — % income saved
    "income_stability":   0.20,  # Reliable income inflows
    "consistency":        0.20,  # Low spend volatility = disciplined
    "spend_control":      0.15,  # Low impulse buying ratio
    "transaction_volume": 0.10,  # Sufficient data / active user
    "digital_adoption":   0.05,  # Digital payment usage
}


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


class CreditScorer:

    def calculate(self, features: Dict[str, Any]) -> Dict[str, Any]:
        income          = max(features["total_income"], 1)
        spent           = features["total_spent"]
        savings_rate    = features.get("savings_rate", 0)          # 0–1
        income_stab     = features.get("income_stability", 0.5)    # 0–1
        consistency     = features.get("consistency_score", 0.5)   # 0–1
        impulse_ratio   = features.get("impulse_ratio", 0.5)       # 0–1 (lower = better)
        txn_count       = features.get("txn_count", 0)
        digital_ratio   = features.get("digital_ratio", 0.5)       # 0–1
        monthly_income  = features.get("monthly_income", 0)
        months          = features.get("months_covered", 1)

        # ── 1. Savings Rate Score (0–100) ─────────────────────────────────
        # > 30% savings → 100,  20–30% → 80–100,  10–20% → 50–80
        # 0–10% → 10–50,  negative (overspending) → 0–10
        if savings_rate >= 0.30:
            s_savings = _clamp(70 + savings_rate * 100)
        elif savings_rate >= 0.10:
            s_savings = _clamp(40 + savings_rate * 150)
        elif savings_rate >= 0:
            s_savings = _clamp(savings_rate * 400)
        else:
            # Overspending — penalize hard
            s_savings = max(0, 10 + savings_rate * 50)

        # ── 2. Income Stability Score (0–100) ─────────────────────────────
        # income_stability is 0–1 from CV of credit amounts
        # Also boost for monthly_income size (higher income = more stable)
        if monthly_income >= 50000:
            income_boost = 20
        elif monthly_income >= 25000:
            income_boost = 10
        elif monthly_income >= 10000:
            income_boost = 5
        else:
            income_boost = 0
        s_income = _clamp(income_stab * 80 + income_boost)

        # ── 3. Consistency Score (0–100) ──────────────────────────────────
        # consistency_score is 0–1 (higher = less volatile daily spend)
        # Bonus for having > 1 month of data
        data_bonus = min(months * 5, 20)
        s_consistency = _clamp(consistency * 80 + data_bonus)

        # ── 4. Spend Control Score (0–100) ────────────────────────────────
        # impulse_ratio is 0–1 (lower = better discipline)
        # Also penalize very high spend/income ratio
        spend_ratio = spent / max(income, 1)
        if spend_ratio > 1.0:          # spending more than income
            s_control = _clamp(5 - (spend_ratio - 1) * 30)
        elif spend_ratio > 0.9:
            s_control = _clamp(15 + (1 - impulse_ratio) * 40)
        elif spend_ratio > 0.7:
            s_control = _clamp(30 + (1 - impulse_ratio) * 50)
        else:
            s_control = _clamp(50 + (1 - impulse_ratio) * 50)

        # ── 5. Transaction Volume Score (0–100) ────────────────────────────
        # Enough transactions to have statistical confidence
        # 30–100 txns/month → good; < 5 → low confidence
        monthly_txns = txn_count / max(months, 1)
        if monthly_txns >= 60:
            s_volume = 100
        elif monthly_txns >= 30:
            s_volume = 70 + (monthly_txns - 30) / 30 * 30
        elif monthly_txns >= 10:
            s_volume = 40 + (monthly_txns - 10) / 20 * 30
        else:
            s_volume = monthly_txns / 10 * 40
        s_volume = _clamp(s_volume)

        # ── 6. Digital Adoption Score (0–100) ─────────────────────────────
        s_digital = _clamp(digital_ratio * 100)

        # ── Weighted composite ─────────────────────────────────────────────
        weighted = (
            s_savings      * WEIGHTS["savings_rate"]       +
            s_income       * WEIGHTS["income_stability"]   +
            s_consistency  * WEIGHTS["consistency"]        +
            s_control      * WEIGHTS["spend_control"]      +
            s_volume       * WEIGHTS["transaction_volume"] +
            s_digital      * WEIGHTS["digital_adoption"]
        )

        # Map 0–100 composite → 300–900 CIBIL-like range
        score = int(np.clip(300 + weighted * 6, 300, 900))

        # Grade
        if score >= 800:   grade = "A+"
        elif score >= 750: grade = "A"
        elif score >= 700: grade = "B+"
        elif score >= 650: grade = "B"
        elif score >= 600: grade = "C+"
        elif score >= 550: grade = "C"
        elif score >= 500: grade = "D"
        else:              grade = "E"

        breakdown = {
            "Savings Rate": {
                "score": round(s_savings),
                "weight": WEIGHTS["savings_rate"],
                "label": f"{round(savings_rate * 100, 1)}% of income saved "
                         f"(₹{int(features.get('net_savings', 0)):,} net)"
            },
            "Income Stability": {
                "score": round(s_income),
                "weight": WEIGHTS["income_stability"],
                "label": f"₹{int(features.get('monthly_income', 0)):,}/mo avg · "
                         f"stability {round(income_stab * 100)}%"
            },
            "Consistency": {
                "score": round(s_consistency),
                "weight": WEIGHTS["consistency"],
                "label": f"Spend volatility: ₹{int(features.get('spend_volatility', 0)):,}/day · "
                         f"{round(months, 1)} months data"
            },
            "Spend Control": {
                "score": round(s_control),
                "weight": WEIGHTS["spend_control"],
                "label": f"{round(spend_ratio * 100)}% income spent · "
                         f"{round(impulse_ratio * 100)}% small impulsive txns"
            },
            "Transaction Volume": {
                "score": round(s_volume),
                "weight": WEIGHTS["transaction_volume"],
                "label": f"{txn_count} transactions · "
                         f"{round(monthly_txns, 1)}/month avg"
            },
            "Digital Adoption": {
                "score": round(s_digital),
                "weight": WEIGHTS["digital_adoption"],
                "label": f"{round(digital_ratio * 100)}% digital payments"
            },
        }

        return {"score": score, "grade": grade, "breakdown": breakdown}


credit_scorer = CreditScorer()
