"""
Financial Personality Classifier
Multi-dimensional rule-based classification using rich behavioral features.
4 Archetypes with nuanced thresholds.
"""

import numpy as np
from typing import Dict, Any


PERSONA_META = {
    "The Impulsive Spender": {
        "risk":   "High",
        "color":  "#FF4D4D",
        "traits": [
            "Spending frequently exceeds income",
            "High frequency of small impulsive transactions",
            "Erratic and unpredictable spending patterns",
        ],
        "advice": "Start with the 50/30/20 rule: 50% for needs, 30% for wants, 20% straight to savings. "
                  "Delete shopping apps from your phone for 30 days.",
    },
    "The Balanced Consumer": {
        "risk":   "Medium",
        "color":  "#FFB84D",
        "traits": [
            "Moderate spending discipline (70–90% of income spent)",
            "Some discretionary flexibility with occasional overspend",
            "Developing savings habits with room to improve",
        ],
        "advice": "You're on the right track! Automate a fixed savings transfer on salary day. "
                  "Aim to push savings rate above 25% this quarter.",
    },
    "The Strategic Saver": {
        "risk":   "Low",
        "color":  "#4DFF88",
        "traits": [
            "Income significantly exceeds spending (saves 30%+)",
            "Consistent and disciplined financial behaviour",
            "Low impulse buying, high digital payment adoption",
        ],
        "advice": "Excellent habits! Channel your surplus into a diversified portfolio: "
                  "Index funds (50%) + FDs (30%) + Gold ETF (20%) for compounding growth.",
    },
    "The Planner": {
        "risk":   "Low",
        "color":  "#4DA6FF",
        "traits": [
            "Structured and predictable spending patterns",
            "Regular saving habit with moderate savings rate (15–30%)",
            "Well-organised cash flows with few surprises",
        ],
        "advice": "Great planning skills! Now optimise tax savings with ELSS funds "
                  "and explore term insurance to protect your wealth.",
    },
    "The Cautious Survivor": {
        "risk":   "Medium",
        "color":  "#C084FC",
        "traits": [
            "Very low income making ends meet",
            "Careful with every rupee spent",
            "Limited savings capacity but responsible behaviour",
        ],
        "advice": "Focus on building a ₹10,000 emergency fund first. "
                  "Explore skill-building platforms and government schemes (PM Jan Dhan, PMSBY) to improve income.",
    },
}


class PersonalityClassifier:

    def classify(self, features: Dict[str, Any]) -> Dict[str, Any]:
        income        = max(features["total_income"], 1)
        spent         = features["total_spent"]
        savings_rate  = features.get("savings_rate", 0)
        impulse_ratio = features.get("impulse_ratio", 0.5)
        consistency   = features.get("consistency_score", 0.5)
        income_stab   = features.get("income_stability", 0.5)
        freq_daily    = features.get("freq_daily", 0)
        monthly_inc   = features.get("monthly_income", 0)
        months        = features.get("months_covered", 1)

        spend_ratio = spent / income   # 0 → 1+ (can exceed 1 if overspending)

        # ── Decision tree with priority order ──────────────────────────────

        # 1. Impulsive: spending ≥ 90% of income AND high impulse / erratic
        if spend_ratio >= 0.90 and (impulse_ratio > 0.4 or freq_daily > 3):
            name = "The Impulsive Spender"

        # 2. Cautious Survivor: very low monthly income (< ₹8,000)
        elif monthly_inc < 8000 and monthly_inc > 0:
            name = "The Cautious Survivor"

        # 3. Strategic Saver: saves 30%+ consistently
        elif savings_rate >= 0.30 and consistency >= 0.55:
            name = "The Strategic Saver"

        # 4. Planner: saves 12–30%, high consistency
        elif 0.12 <= savings_rate < 0.30 and consistency >= 0.45:
            name = "The Planner"

        # 5. Balanced Consumer: 70–90% spend ratio
        elif spend_ratio >= 0.70:
            name = "The Balanced Consumer"

        # 6. Strategic Saver fallback (low spend ratio regardless of consistency)
        elif savings_rate >= 0.20:
            name = "The Strategic Saver"

        # 7. Default to Balanced
        else:
            name = "The Balanced Consumer"

        meta = PERSONA_META[name]
        return {
            "persona":       name,
            "risk":          meta["risk"],
            "color":         meta["color"],
            "traits":        meta["traits"],
            "advice":        meta["advice"],
            "spending_ratio": round(spend_ratio * 100, 1),
        }


personality_classifier = PersonalityClassifier()
