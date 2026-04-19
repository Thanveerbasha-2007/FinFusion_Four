import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadPDF } from "../services/api";
import { useNavigate } from "react-router-dom";

const STEPS = ["Select PDF", "Upload & Parse", "View Results"];

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") { setFile(f); setError(""); setStep(1); }
    else setError("Please select a valid PDF file.");
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    if (!file) { setError("Please select a PDF file first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await uploadPDF(file);
      if (res.error) throw new Error(res.error);
      setResult(res); setStep(2);
    } catch (err) {
      setError(err.message || "Upload failed. Ensure your PDF has text-based transactions.");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 900 }}>
          <span className="gradient-text">Upload Statement</span> 📄
        </motion.h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>Auto-extract transactions from PhonePe · Canara · HDFC · SBI · ICICI · Axis</p>
      </div>

      {/* Progress steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32, maxWidth: 500 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <motion.div animate={{ scale: step === i ? 1.15 : 1 }} style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, background: step >= i ? "linear-gradient(135deg,#6366f1,#06b6d4)" : "rgba(255,255,255,0.06)", color: step >= i ? "#fff" : "var(--text-muted)", boxShadow: step === i ? "0 0 20px rgba(99,102,241,0.6)" : "none", transition: "all 0.3s ease" }}>
                {step > i ? "✓" : i + 1}
              </motion.div>
              <span style={{ fontSize: 11, color: step >= i ? "var(--accent)" : "var(--text-muted)", fontWeight: step === i ? 700 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? "linear-gradient(90deg,#6366f1,#06b6d4)" : "rgba(255,255,255,0.06)", marginBottom: 20, transition: "background 0.5s ease" }} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0/1: Drop zone */}
        {step < 2 && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className={`upload-zone ${dragging ? "drag-over" : ""}`} style={{ marginBottom: 24, minHeight: 260 }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}>
              <input id="pdf-file-input" ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div style={{ fontSize: 64, marginBottom: 16, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.8))" }}>📄</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>{file.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} style={{ fontSize: 72, marginBottom: 20, filter: "drop-shadow(0 0 15px rgba(99,102,241,0.5))" }}>📂</motion.div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Drop your PDF here</div>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>or click to browse files</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      {["PhonePe", "Canara", "HDFC", "SBI", "ICICI", "Axis"].map(b => (
                        <span key={b} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--accent)" }}>{b}</span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-error" style={{ marginBottom: 16 }}>{error}</motion.div>}

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center" }}>
                <button id="upload-btn" className="btn btn-primary btn-lg" onClick={handleUpload} disabled={loading}
                  style={{ minWidth: 200, position: "relative" }}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Parsing Statement…
                    </span>
                  ) : "🚀 Parse & Analyze PDF"}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 2: Success result */}
        {step === 2 && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <div className="glass-card" style={{ padding: "48px 32px", textAlign: "center", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 0.6 }} style={{ fontSize: 72, marginBottom: 20, filter: "drop-shadow(0 0 30px rgba(16,185,129,0.8))" }}>🎉</motion.div>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 8 }} className="gradient-text-green">Analysis Complete!</h2>
              <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>Your PhonePe statement has been parsed and analyzed by AI</p>

              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
                {[
                  { label: "Transactions Imported", value: result.transactions_added, color: "#6366f1" },
                  { label: "WalletWizz Score", value: result.credit_score, color: "#10b981" },
                  { label: "Grade", value: result.grade, color: "#06b6d4" },
                ].map(({ label, value, color }) => (
                  <motion.div key={label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="stat-card" style={{ minWidth: 140, textAlign: "center", background: `${color}12`, borderColor: `${color}30`, boxShadow: `0 0 20px ${color}22` }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'Outfit',sans-serif" }}>{value}</div>
                  </motion.div>
                ))}
              </div>

              <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 500, margin: "0 auto 28px", textAlign: "left" }}>
                <strong style={{ color: "var(--accent)" }}>🤖 AI Insight: </strong>{result.advice}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button className="btn btn-primary btn-lg" onClick={() => navigate("/dashboard")}>View Dashboard →</button>
                <button className="btn btn-secondary" onClick={() => { setResult(null); setFile(null); setStep(0); }}>Upload Another</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card" style={{ padding: 28, marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>💡 How to Download Your Statement</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { bank: "📱 PhonePe", tip: "App → Profile → Account Statement → Download PDF" },
            { bank: "🏦 HDFC", tip: "NetBanking → Accounts → Account Statement → Download" },
            { bank: "🏛️ SBI", tip: "YONO App → Account → Statement → Select Date Range" },
            { bank: "💳 ICICI", tip: "iMobile → Accounts → e-Statement → Download PDF" },
          ].map(({ bank, tip }) => (
            <div key={bank} style={{ padding: 16, borderRadius: "var(--radius-md)", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>{bank}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{tip}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UploadPage;
