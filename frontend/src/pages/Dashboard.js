import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { getDashboard, runAnalysis, bulkCreateTransactions } from "../services/api";
import ScoreOrb from "../components/ScoreOrb";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Animated number counter
const Counter = ({ to, prefix = "", suffix = "", decimals = 0 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!to) return;
    let start = 0; const end = Number(to);
    const dur = 1400; const step = 16;
    const inc = (end - start) / (dur / step);
    const timer = setInterval(() => {
      start += inc;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(start);
    }, step);
    return () => clearInterval(timer);
  }, [to]);
  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-IN");
  return <>{prefix}{display}{suffix}</>;
};

// Floating particle background
const Particles = () => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i, size: 2 + Math.random() * 4,
    left: Math.random() * 100, delay: Math.random() * 20,
    duration: 15 + Math.random() * 25,
    color: ["rgba(99,102,241,0.5)", "rgba(6,182,212,0.4)", "rgba(168,85,247,0.4)", "rgba(16,185,129,0.3)"][i % 4],
  }));
  return (
    <div className="particle-bg">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          width: p.size, height: p.size, left: `${p.left}%`, bottom: "-10px",
          background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
};

// 3D tilt card
const TiltCard = ({ children, className = "", style = {} }) => {
  const ref = useRef(null);
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const rotX = useTransform(rx, [-1, 1], [8, -8]);
  const rotY = useTransform(ry, [-1, 1], [-8, 8]);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    rx.set((e.clientY - r.top - r.height / 2) / (r.height / 2));
    ry.set((e.clientX - r.left - r.width / 2) / (r.width / 2));
  };
  const onLeave = () => { animate(rx, 0, { duration: 0.5 }); animate(ry, 0, { duration: 0.5 }); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1000, ...style }}
      className={className}>
      {children}
    </motion.div>
  );
};

const DEMO_TRANSACTIONS = (() => {
  const now = new Date(); const txns = [];
  const debits = [
    { description: "Zomato order", category: "dining", mode: "UPI" },
    { description: "Amazon purchase", category: "shopping", mode: "UPI" },
    { description: "Ola cab", category: "transportation", mode: "UPI" },
    { description: "Netflix subscription", category: "entertainment", mode: "CARD" },
    { description: "BigBasket order", category: "groceries", mode: "UPI" },
    { description: "Electricity bill BESCOM", category: "utilities", mode: "NEFT" },
    { description: "Airtel recharge", category: "utilities", mode: "UPI" },
    { description: "Swiggy food", category: "dining", mode: "UPI" },
  ];
  for (let m = 0; m < 3; m++) {
    txns.push({ date: new Date(now.getFullYear(), now.getMonth() - m, 1).toISOString(), description: "SALARY CREDIT", amount: 45000 + Math.random() * 10000, type: "credit", category: "income", mode: "NEFT" });
  }
  for (let i = 0; i < 80; i++) {
    const d = debits[Math.floor(Math.random() * debits.length)];
    txns.push({ date: new Date(now - Math.random() * 90 * 86400000).toISOString(), description: d.description, amount: 100 + Math.random() * 2400, type: "debit", category: d.category, mode: d.mode });
  }
  return txns;
})();

const STAT_CONFIG = [
  { key: "total_income", label: "Total Income", prefix: "₹", color: "#10b981", glow: "rgba(16,185,129,0.3)", icon: "💰", gradient: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.03))" },
  { key: "total_spent",  label: "Total Spent",  prefix: "₹", color: "#ef4444", glow: "rgba(239,68,68,0.3)",   icon: "💸", gradient: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.03))" },
  { key: "txn_count",   label: "Transactions",  prefix: "",  color: "#6366f1", glow: "rgba(99,102,241,0.3)",  icon: "📊", gradient: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.03))" },
  { key: "savings_rate",label: "Savings Rate",  prefix: "",  suffix: "%", decimals: 1, color: "#06b6d4", glow: "rgba(6,182,212,0.3)", icon: "📈", gradient: "linear-gradient(135deg,rgba(6,182,212,0.15),rgba(6,182,212,0.03))", transform: v => (v * 100).toFixed(1) },
];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchDashboard = useCallback(async () => {
    try { const d = await getDashboard(); setData(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSeedDemo = async () => {
    setSeeding(true); setMsg("");
    try {
      await bulkCreateTransactions(DEMO_TRANSACTIONS);
      const res = await runAnalysis();
      setMsg(`✅ Demo loaded! Score: ${res.credit_score} (${res.grade})`);
      await fetchDashboard();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setSeeding(false); }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true); setMsg("");
    try {
      const res = await runAnalysis();
      setMsg(`✅ Analysis complete! Score: ${res.credit_score} (${res.grade})`);
      await fetchDashboard();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setAnalyzing(false); }
  };

  const cs = data?.credit_score;
  const features = data?.features;
  const txns = data?.recent_transactions || [];
  const trend = cs?.predictions?.monthly_trend || [];

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 20 }}>
      <div style={{ width: 60, height: 60, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "var(--text-muted)", fontSize: 14, letterSpacing: "0.1em" }}>LOADING YOUR UNIVERSE…</p>
    </div>
  );

  const gradeColors = { "A+": "#10b981", "A": "#34d399", "B+": "#6366f1", "B": "#818cf8", "C+": "#f59e0b", "C": "#f97316", "D": "#ef4444", "E": "#dc2626" };
  const gradeColor = gradeColors[cs?.grade] || "#6366f1";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} style={{ position: "relative" }}>
      <Particles />

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <div>
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ fontFamily: "'Outfit','Space Grotesk',sans-serif", fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}>
            <span className="gradient-text">Financial Dashboard</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
            AI-powered behavioral credit intelligence
          </motion.p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!cs && <button id="load-demo-btn" className="btn btn-secondary" onClick={handleSeedDemo} disabled={seeding}>{seeding ? "Loading…" : "🚀 Load Demo Data"}</button>}
          {txns.length > 0 && <button id="analyze-btn" className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? "⏳ Analyzing…" : "🤖 Run AI Analysis"}</button>}
        </div>
      </div>

      {msg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`alert mt-16 mb-16 ${msg.startsWith("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: 24 }}>{msg}</motion.div>}

      {/* ── No data state ── */}
      {!cs ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          style={{ textAlign: "center", padding: "80px 24px", background: "var(--glass-bg)", backdropFilter: "blur(24px)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div className="float" style={{ fontSize: 72, marginBottom: 24 }}>📊</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }} className="gradient-text">No Financial Data Yet</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 15, maxWidth: 400, margin: "0 auto 32px" }}>
            Load demo data or upload your PhonePe / bank statement to get your AI-powered WalletWizz Score
          </p>
          <button id="get-started-btn" className="btn btn-primary btn-lg" onClick={handleSeedDemo} disabled={seeding}
            style={{ fontSize: 16, padding: "14px 32px" }}>
            {seeding ? "⏳ Loading Demo…" : "🚀 Get Started with Demo Data"}
          </button>
        </motion.div>
      ) : (
        <>
          {/* ── Score Hero ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <TiltCard>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="glass-card pulse-glow" style={{ padding: 32, position: "relative", overflow: "hidden", minHeight: 340 }}>
                {/* Background glow */}
                <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, background: `radial-gradient(circle, ${gradeColor}22 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>💎 WalletWizz Score</div>
                <ScoreOrb score={cs.score} />
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    style={{ display: "inline-block", padding: "8px 22px", borderRadius: 99, fontWeight: 800, fontSize: 15, background: `${gradeColor}22`, color: gradeColor, border: `1px solid ${gradeColor}44`, boxShadow: `0 0 20px ${gradeColor}33` }}>
                    {cs.persona}
                  </motion.span>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                    Grade: <span style={{ color: gradeColor, fontWeight: 800, fontSize: 16 }}>{cs.grade}</span>
                    {" · "}Risk: <span style={{ color: cs.risk_level === "High" ? "var(--red)" : cs.risk_level === "Medium" ? "var(--yellow)" : "var(--green)", fontWeight: 700 }}>{cs.risk_level}</span>
                  </div>
                </div>
              </motion.div>
            </TiltCard>

            {/* ── Stat grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {STAT_CONFIG.map((cfg, i) => {
                const raw = features?.[cfg.key];
                const val = cfg.transform ? cfg.transform(raw) : raw;
                return (
                  <motion.div key={cfg.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                    className="stat-card" style={{ background: cfg.gradient, borderColor: `${cfg.color}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{cfg.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: cfg.color, fontFamily: "'Outfit',sans-serif", textShadow: `0 0 20px ${cfg.glow}` }}>
                      {val != null ? <Counter to={Number(val)} prefix={cfg.prefix} suffix={cfg.suffix || ""} decimals={cfg.decimals || 0} /> : "—"}
                    </div>
                  </motion.div>
                );
              })}

              {/* Top recommendation */}
              {cs.recommendations?.[0] && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="glass-card" style={{ gridColumn: "1/-1", padding: 20, borderLeft: "3px solid var(--accent)", background: "rgba(99,102,241,0.07)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>💡 Top Insight</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{cs.recommendations[0]}</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Spending Trend ── */}
          {trend.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>📈 6-Month Trend</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>Income vs Spending</div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 3, background: "#10b981", borderRadius: 2, display: "inline-block" }} />Income</span>
                  <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 3, background: "#ef4444", borderRadius: 2, display: "inline-block" }} />Spending</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "rgba(8,12,28,0.95)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }} formatter={v => [`₹${v.toLocaleString()}`, ""]} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#gIncome)" name="Income" dot={{ fill: "#10b981", r: 3 }} />
                  <Area type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2.5} fill="url(#gSpend)" name="Spending" dot={{ fill: "#ef4444", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* ── Recent Transactions ── */}
          {txns.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="glass-card" style={{ padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 20 }}>🕐 Recent Transactions</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Type</th><th>Mode</th></tr></thead>
                  <tbody>
                    {txns.slice(0, 10).map((t, i) => (
                      <motion.tr key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.description}</td>
                        <td><span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>{t.category}</span></td>
                        <td style={{ fontWeight: 700, color: t.type === "credit" ? "var(--green)" : "var(--red)", fontFamily: "'Outfit',sans-serif" }}>
                          {t.type === "credit" ? "+" : "−"}₹{Number(t.amount).toLocaleString("en-IN")}
                        </td>
                        <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                        <td><span className={`badge ${t.mode === "UPI" ? "badge-upi" : ""}`}>{t.mode}</span></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Dashboard;
