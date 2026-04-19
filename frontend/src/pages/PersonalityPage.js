import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboard } from "../services/api";

const PERSONA_META = {
  "The Impulsive Spender": { emoji: "💸", color: "#ef4444", traits: ["Spending frequently exceeds income", "High impulsive transaction rate", "Erratic patterns"], bg: "rgba(239,68,68,0.08)" },
  "The Balanced Consumer": { emoji: "⚖️", color: "#f59e0b", traits: ["Moderate discipline (70–90% spent)", "Some discretionary flexibility", "Developing savings habits"], bg: "rgba(245,158,11,0.08)" },
  "The Strategic Saver":   { emoji: "🏦", color: "#10b981", traits: ["Saves 30%+ of income", "High consistency", "Low impulse buying"], bg: "rgba(16,185,129,0.08)" },
  "The Planner":           { emoji: "📋", color: "#6366f1", traits: ["Structured spending (saves 12–30%)", "Predictable cash flows", "Well-organised"], bg: "rgba(99,102,241,0.08)" },
  "The Cautious Survivor": { emoji: "🛡️", color: "#a855f7", traits: ["Very careful with every rupee", "Limited income, responsible habits", "Building financial foundation"], bg: "rgba(168,85,247,0.08)" },
};

const PersonalityPage = () => {
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getDashboard().then(d => setCs(d.credit_score)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loading-center"><div style={{ width: 50, height: 50, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>;

  if (!cs) return (
    <div className="loading-center">
      <div style={{ textAlign: "center" }}>
        <div className="float" style={{ fontSize: 64, marginBottom: 16 }}>🧠</div>
        <h2 className="gradient-text" style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Run Analysis First</h2>
        <p style={{ color: "var(--text-muted)" }}>Go to Dashboard → Run AI Analysis</p>
      </div>
    </div>
  );

  const meta = PERSONA_META[cs.persona] || PERSONA_META["The Planner"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div style={{ marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 900 }}>
          <span className="gradient-text">Financial Personality</span> 🧠
        </motion.h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>Understand what drives your financial behavior</p>
      </div>

      {/* Hero persona card */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-card" style={{ padding: "56px 32px", textAlign: "center", marginBottom: 24, position: "relative", overflow: "hidden", background: meta.bg }}>
        {/* Animated ring behind emoji */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${meta.color}20 0%, transparent 70%)`, pointerEvents: "none" }} />
        <motion.div animate={{ y: [0, -12, 0], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          style={{ fontSize: 96, lineHeight: 1, marginBottom: 24, filter: `drop-shadow(0 0 30px ${meta.color}88)` }}>
          {meta.emoji}
        </motion.div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 38, fontWeight: 900, color: meta.color, marginBottom: 12, textShadow: `0 0 40px ${meta.color}66` }}>
          {cs.persona}
        </h2>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 22px", borderRadius: 99, border: `1px solid ${meta.color}55`, background: `${meta.color}18`, color: meta.color, fontSize: 14, fontWeight: 700, marginBottom: 28, boxShadow: `0 0 20px ${meta.color}33` }}>
          Risk Level: {cs.risk_level}
        </motion.div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          {meta.traits.map((t, i) => (
            <motion.span key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              style={{ padding: "8px 18px", borderRadius: 99, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, fontSize: 13, color: meta.color, fontWeight: 600 }}>
              {t}
            </motion.span>
          ))}
        </div>
        {/* Spending ratio arc */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Spending ratio:</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: meta.color, fontFamily: "'Outfit',sans-serif" }}>{cs.predictions?.category_breakdown ? Object.keys(cs.predictions.category_breakdown).length : 0}+ categories</span>
        </div>
      </motion.div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* AI explanation */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="glass-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>💡 AI Explanation</div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.9, marginBottom: 16 }}>
            You are classified as <strong style={{ color: meta.color }}>{cs.persona}</strong> based on your income-to-spending ratio, transaction frequency, impulse buying patterns, and behavioral consistency detected from your real financial data.
          </p>
          <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: `${meta.color}10`, border: `1px solid ${meta.color}25`, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {cs.recommendations?.[0] || "Keep up the excellent financial habits!"}
          </div>
        </motion.div>

        {/* Persona map */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="glass-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>🗺️ Persona Map</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(PERSONA_META).map(([name, m], i) => {
              const isYou = cs.persona === name;
              return (
                <motion.div key={name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: "var(--radius-md)", background: isYou ? `${m.color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${isYou ? m.color + "50" : "transparent"}`, boxShadow: isYou ? `0 0 20px ${m.color}22` : "none", transition: "all 0.3s ease" }}>
                  <span style={{ fontSize: 24, filter: isYou ? `drop-shadow(0 0 8px ${m.color})` : "none" }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: isYou ? 700 : 500, color: isYou ? m.color : "var(--text-secondary)" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.traits[0]}</div>
                  </div>
                  {isYou && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${m.color}22`, color: m.color }}>← You</span>}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PersonalityPage;
