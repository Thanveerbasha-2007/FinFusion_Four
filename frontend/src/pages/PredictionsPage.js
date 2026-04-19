import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboard } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const PredictionsPage = () => {
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(d => setCs(d.credit_score)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!cs?.predictions) return (
    <div className="loading-center">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>📈</div>
        <h2 style={{ marginTop: 16 }}>No predictions yet</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Run AI analysis from the dashboard first.</p>
      </div>
    </div>
  );

  const pred  = cs.predictions;
  const trend = pred.monthly_trend || [];
  const cats  = Object.entries(pred.category_breakdown || {}).map(([name, value]) => ({ name, value }));
  const risk  = pred.risk_probability || 0;
  const riskColor = risk > 70 ? "var(--red)" : risk > 40 ? "var(--yellow)" : "var(--green)";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1 className="page-title">Predictions 📈</h1>
        <p className="page-subtitle">AI-powered forecasts of your financial future</p>
      </div>

      {/* Risk + KPIs */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <motion.div className="stat-card" whileHover={{ scale: 1.04 }}>
          <div style={{ fontSize: 22 }}>⚠️</div>
          <div className="stat-label">Overspend Risk</div>
          <div className="stat-value" style={{ color: riskColor }}>{risk}%</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {risk > 70 ? "High risk" : risk > 40 ? "Moderate" : "Low risk"}
          </div>
        </motion.div>
        <motion.div className="stat-card" whileHover={{ scale: 1.04 }}>
          <div style={{ fontSize: 22 }}>📉</div>
          <div className="stat-label">Next Month Spend</div>
          <div className="stat-value" style={{ color: "var(--red)" }}>
            ₹{Number(pred.next_month_spending || 0).toLocaleString("en-IN")}
          </div>
        </motion.div>
        <motion.div className="stat-card" whileHover={{ scale: 1.04 }}>
          <div style={{ fontSize: 22 }}>💰</div>
          <div className="stat-label">Savings Potential</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>
            ₹{Number(pred.savings_potential || 0).toLocaleString("en-IN")}
          </div>
        </motion.div>
      </div>

      {/* Risk Meter */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">🎯 Risk Probability Meter</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="risk-bar">
              <motion.div
                className="risk-fill"
                style={{ background: riskColor }}
                initial={{ width: 0 }}
                animate={{ width: `${risk}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: riskColor, minWidth: 60 }}>{risk}%</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          Probability of overspending your income next month
        </div>
      </div>

      <div className="grid-2">
        {/* Trend Chart */}
        <div className="card">
          <div className="card-title">📊 Income vs Spending (6 Month Trend)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="predIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={v => [`₹${v.toLocaleString()}`, ""]}
              />
              <Area type="monotone" dataKey="income"   stroke="#10b981" fill="url(#predIncome)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="spending"  stroke="#ef4444" fill="url(#predSpend)"  strokeWidth={2} name="Spending" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Bar */}
        <div className="card">
          <div className="card-title">🗂️ Spending by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cats} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={v => [`₹${v.toLocaleString()}`, ""]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cats.map((_, i) => (
                  <Cell key={i} fill={`hsl(${200 + i * 30}, 70%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default PredictionsPage;
