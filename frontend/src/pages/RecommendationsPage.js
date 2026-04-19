import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboard } from "../services/api";

const RecommendationsPage = () => {
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(new Set());

  useEffect(() => {
    getDashboard().then(d => setCs(d.credit_score)).finally(() => setLoading(false));
  }, []);

  const toggleDone = (i) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!cs?.recommendations?.length) return (
    <div className="loading-center">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>💡</div>
        <h2 style={{ marginTop: 16 }}>No recommendations yet</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Run AI analysis from the Dashboard first.</p>
      </div>
    </div>
  );

  const recs = cs.recommendations;
  const completed = done.size;
  const pct = Math.round((completed / recs.length) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1 className="page-title">Recommendations 💡</h1>
        <p className="page-subtitle">Personalized AI-generated actions to improve your score</p>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Progress: {completed}/{recs.length} completed</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>{pct}%</span>
        </div>
        <div className="breakdown-bar" style={{ height: 8 }}>
          <motion.div
            className="breakdown-fill"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
            style={{ height: "100%", borderRadius: 99 }}
          />
        </div>
      </div>

      {/* Rec cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recs.map((rec, i) => (
          <motion.div
            key={i}
            className="rec-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              opacity: done.has(i) ? 0.5 : 1,
              borderColor: done.has(i) ? "var(--green)" : "var(--border)",
            }}
          >
            <span className="rec-card-icon">{rec.slice(0, 2)}</span>
            <span className="rec-card-text" style={{ textDecoration: done.has(i) ? "line-through" : "none" }}>
              {rec.slice(2)}
            </span>
            <button
              className={`btn btn-sm ${done.has(i) ? "btn-secondary" : "btn-primary"}`}
              style={{ flexShrink: 0, marginLeft: "auto" }}
              onClick={() => toggleDone(i)}
            >
              {done.has(i) ? "Undo" : "✓ Done"}
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecommendationsPage;
