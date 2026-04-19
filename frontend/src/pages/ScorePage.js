import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboard } from "../services/api";
import ScoreOrb from "../components/ScoreOrb";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const ScorePage = () => {
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(d => setCs(d.credit_score)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center">
      <div style={{ width: 50, height: 50, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!cs) return (
    <div className="loading-center">
      <div style={{ textAlign: "center" }}>
        <div className="float" style={{ fontSize: 64, marginBottom: 20 }}>🎯</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }} className="gradient-text">No Score Yet</h2>
        <p style={{ color: "var(--text-muted)" }}>Go to Dashboard → Load demo data or upload a statement.</p>
      </div>
    </div>
  );

  const breakdown = cs.breakdown || {};
  const radarData = Object.entries(breakdown).map(([name, v]) => ({ subject: name.replace(" ", "\n"), score: v.score, fullMark: 100 }));

  const gradeColors = { "A+": "#10b981", "A": "#34d399", "B+": "#6366f1", "B": "#818cf8", "C+": "#f59e0b", "C": "#f97316", "D": "#ef4444", "E": "#dc2626" };
  const gc = gradeColors[cs.grade] || "#6366f1";

  const getBarColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#6366f1";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 900 }}>
          <span className="gradient-text">Credit Score</span> 🎯
        </motion.h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>Explainable AI breakdown of your financial health</p>
      </div>

      {/* Score + Radar row */}
      <div className="grid-2" style={{ marginBottom: 24, gap: 24 }}>
        {/* 3D Score Card */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="glass-card pulse-glow" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 280, background: `radial-gradient(circle, ${gc}22 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>Your WalletWizz Score</div>
          <ScoreOrb score={cs.score} />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Grade: <span style={{ color: gc, fontWeight: 900, fontSize: 20 }}>{cs.grade}</span>
              {" · "}Risk: <span style={{ fontWeight: 700, color: cs.risk_level === "High" ? "var(--red)" : cs.risk_level === "Medium" ? "var(--yellow)" : "var(--green)" }}>{cs.risk_level}</span>
            </div>
            {/* Score meter */}
            <div style={{ marginTop: 16, padding: "0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>
                {["300", "450", "600", "750", "900"].map(v => <span key={v}>{v}</span>)}
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${((cs.score - 300) / 600) * 100}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, #ef4444, #f59e0b, #10b981)`, boxShadow: `0 0 12px ${gc}` }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Animated Radar */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="glass-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>📡 Score Dimensions Radar</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} outerRadius={90}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 600 }} />
              <Radar dataKey="score" stroke={gc} fill={gc} fillOpacity={0.18} strokeWidth={2.5} dot={{ fill: gc, r: 4, fillOpacity: 1 }} />
              <Tooltip contentStyle={{ background: "rgba(8,12,28,0.95)", border: `1px solid ${gc}44`, borderRadius: 10, fontSize: 12, backdropFilter: "blur(10px)" }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Factor Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-card" style={{ padding: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 24 }}>🔬 Factor-by-Factor Breakdown (Explainable AI)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(breakdown).map(([name, v], i) => {
            const bc = getBarColor(v.score);
            return (
              <motion.div key={name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
                    <span style={{ marginLeft: 10, fontSize: 11, color: "var(--text-muted)" }}>weight {Math.round(v.weight * 100)}%</span>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 900, color: bc, fontFamily: "'Outfit',sans-serif", textShadow: `0 0 12px ${bc}` }}>{v.score}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/100</span></span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${v.score}%` }} transition={{ duration: 1.2, delay: 0.1 * i, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${bc}, ${bc}99)`, boxShadow: `0 0 10px ${bc}66` }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.label}</div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScorePage;
