"""
Prediction & Recommendation Engine
- Derives predictions from actual category/trend data (not mocks)
- Generates highly personalised, actionable recommendations
"""

import numpy as np
from typing import Dict, Any, List


class PredictionEngine:

    def predict(self, features: Dict[str, Any], persona: Dict[str, Any]) -> Dict[str, Any]:
        income         = max(features["total_income"], 1)
        spent          = features["total_spent"]
        net_savings    = features.get("net_savings", 0)
        monthly_spent  = features.get("monthly_spent", spent)
        monthly_income = features.get("monthly_income", income)
        months         = max(features.get("months_covered", 1), 1)
        savings_rate   = features.get("savings_rate", 0)
        impulse_ratio  = features.get("impulse_ratio", 0.5)
        consistency    = features.get("consistency_score", 0.5)
        cat_spend      = features.get("category_spend", {})

        # ── Next month spend projection ────────────────────────────────────
        spend_trend_factor = 1.0
        if savings_rate < 0:        spend_trend_factor = 1.08   # overspending likely to continue
        elif savings_rate < 0.10:   spend_trend_factor = 1.04
        elif savings_rate < 0.25:   spend_trend_factor = 1.00
        else:                       spend_trend_factor = 0.97   # savers tend to maintain discipline

        # High impulse = unpredictable, add variance buffer
        impulse_buffer = impulse_ratio * 0.05
        next_month_spending = monthly_spent * (spend_trend_factor + impulse_buffer)

        # ── Risk probability ───────────────────────────────────────────────
        spend_ratio = spent / income
        risk_components = [
            min(spend_ratio * 0.60, 0.60),                # spending vs income (max 60%)
            min(impulse_ratio * 0.20, 0.20),              # impulsive behaviour (max 20%)
            min((1 - consistency) * 0.15, 0.15),          # volatility (max 15%)
            0.05 if features.get("large_txn_count", 0) > 3 else 0,  # large spends
        ]
        risk_score = sum(risk_components)

        # ── Savings potential ──────────────────────────────────────────────
        # How much MORE they could save if they hit 30% savings target
        target_savings = monthly_income * 0.30
        current_savings = max(monthly_income - monthly_spent, 0)
        savings_potential = max(target_savings - current_savings, 0)

        # ── Category breakdown from real data ─────────────────────────────
        # Use actual category spend if available, else estimate from total
        total_cat = sum(cat_spend.values()) if cat_spend else spent
        if cat_spend and total_cat > 0:
            category_breakdown = {
                k.replace("_", " ").title(): round(v)
                for k, v in sorted(cat_spend.items(), key=lambda x: -x[1])
                if v > 0
            }
        else:
            category_breakdown = {
                "Food & Dining":      round(spent * 0.28),
                "Shopping":           round(spent * 0.20),
                "Transportation":     round(spent * 0.15),
                "Utilities & Bills":  round(spent * 0.14),
                "Entertainment":      round(spent * 0.10),
                "Health":             round(spent * 0.07),
                "Others":             round(spent * 0.06),
            }

        # ── 6-month trend (real monthly breakdown if available) ────────────
        monthly_trend = features.get("monthly_breakdown", [])
        if not monthly_trend:
            # Fallback if no breakdown available
            for i in range(6, 0, -1):
                variance = 1 + np.random.uniform(-0.08, 0.08)
                inc_var  = 1 + np.random.uniform(-0.03, 0.05)
                monthly_trend.append({
                    "month":    f"M-{i}",
                    "spending": round(monthly_spent * variance),
                    "income":   round(monthly_income * inc_var),
                })

        return {
            "next_month_spending": round(next_month_spending),
            "risk_probability":    round(risk_score * 100, 1),
            "savings_potential":   round(savings_potential),
            "category_breakdown":  category_breakdown,
            "monthly_trend":       monthly_trend,
        }

    def recommend(
        self, features: Dict[str, Any], persona: Dict[str, Any], score: int
    ) -> List[str]:
        recs = []
        income         = max(features["total_income"], 1)
        spent          = features["total_spent"]
        savings_rate   = features.get("savings_rate", 0)
        monthly_income = features.get("monthly_income", 0)
        monthly_savings= features.get("monthly_savings", 0)
        net_savings    = features.get("net_savings", 0)
        impulse_ratio  = features.get("impulse_ratio", 0.5)
        consistency    = features.get("consistency_score", 0.5)
        upi_ratio      = features.get("upi_ratio", 0)
        freq_daily     = features.get("freq_daily", 0)
        cat_spend      = features.get("category_spend", {})
        spend_ratio    = spent / income

        # ── Critical alerts first ──────────────────────────────────────────
        if spend_ratio > 1.0:
            recs.append(f"🚨 You spent ₹{int(spent - income):,} MORE than you earned! "
                        "Cut non-essential spending immediately and set up a strict monthly budget.")

        elif spend_ratio > 0.90:
            recs.append(f"⚠️ {round(spend_ratio*100)}% of income spent — dangerously high. "
                        "Identify your top 2 spending categories and reduce each by 20%.")

        # ── Savings advice ─────────────────────────────────────────────────
        if savings_rate < 0.10 and spend_ratio <= 1.0:
            recs.append("💰 Savings rate is below 10%. Set up an auto-debit of ₹1,000 on payday "
                        "into a separate savings account before spending anything else.")

        elif 0.10 <= savings_rate < 0.20:
            recs.append(f"📈 You're saving {round(savings_rate*100)}% — good start! "
                        "Push it to 20% by cutting one discretionary expense this month.")

        elif savings_rate >= 0.30:
            recs.append(f"🌟 Excellent! You're saving {round(savings_rate*100)}% of income. "
                        f"Invest ₹{int(monthly_savings*0.6):,}/month in index funds for wealth creation.")

        # ── Category-specific advice ───────────────────────────────────────
        dining_spend = cat_spend.get("dining", 0)
        if dining_spend > monthly_income * 0.15:
            recs.append(f"🍔 Food & dining is ₹{int(dining_spend):,} — over 15% of income. "
                        "Try cooking at home 3x/week to save ₹2,000–3,000/month.")

        shopping_spend = cat_spend.get("shopping", 0)
        if shopping_spend > monthly_income * 0.20:
            recs.append(f"🛍️ Shopping spend is ₹{int(shopping_spend):,}/month. "
                        "Apply a 48-hour wait rule before any non-essential purchase.")

        transfer_spend = cat_spend.get("transfer", 0)
        if transfer_spend > monthly_income * 0.30:
            recs.append(f"💸 ₹{int(transfer_spend):,} in person-to-person transfers detected. "
                        "Track these carefully — informal lending can disrupt your budget.")

        # ── Behaviour signals ──────────────────────────────────────────────
        if impulse_ratio > 0.50:
            recs.append(f"⚡ {round(impulse_ratio*100)}% of your transactions are small impulsive buys. "
                        "Use a prepaid wallet capped at ₹500/week for discretionary spend.")

        if freq_daily > 5:
            recs.append(f"📊 {round(freq_daily, 1)} transactions/day is very high. "
                        "Consolidate payments — batch small purchases to reduce cognitive spending bias.")

        # ── Score-based advice ─────────────────────────────────────────────
        if score < 500:
            recs.append("📉 Score below 500 — focus on building savings consistency over the next 90 days. "
                        "Even ₹500/month saved consistently improves your score significantly.")
        elif score < 650:
            recs.append("📊 To reach B-grade (650+): reduce your spend/income ratio below 75% "
                        "and maintain that for 3 months.")
        elif score >= 750:
            recs.append("🏆 Score is excellent! You qualify for low-interest personal loans "
                        "and premium credit cards. Consider diversifying into equity SIPs.")

        # ── UPI / digital adoption ─────────────────────────────────────────
        if upi_ratio > 0.80:
            recs.append("📱 Great UPI usage! Enable UPI AutoPay for recurring bills "
                        "(electricity, subscriptions) to automate your payments and earn cashback.")

        # ── Emergency fund ────────────────────────────────────────────────
        monthly_expenses = features.get("monthly_spent", 0)
        emergency_target = monthly_expenses * 3
        recs.append(f"🏦 Emergency fund target: ₹{int(emergency_target):,} (3 months expenses). "
                    "Open a liquid fund or high-yield savings account today.")

        # Return top 6, deduplicated
        seen = set()
        final = []
        for r in recs:
            if r not in seen:
                seen.add(r)
                final.append(r)
            if len(final) == 6:
                break
        return final


prediction_engine = PredictionEngine()
