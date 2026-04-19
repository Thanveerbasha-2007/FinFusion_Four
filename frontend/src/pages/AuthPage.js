import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { registerUser, loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import WalletWizzLogo from "../components/WalletWizzLogo";

const AuthPage = ({ mode = "login" }) => {
  const [form, setForm]       = useState({ email: "", password: "", full_name: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const isRegister = mode === "register";

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const fn  = isRegister ? registerUser : loginUser;
      const res = await fn(form);
      login(res.access_token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Floating orbit rings behind card ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Large outer ring */}
        <motion.div
          style={{
            position: "absolute", top: "50%", left: "50%",
            width: 700, height: 700, marginLeft: -350, marginTop: -350,
            borderRadius: "50%",
            border: "1px solid rgba(124,58,237,0.1)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        {/* Medium ring */}
        <motion.div
          style={{
            position: "absolute", top: "50%", left: "50%",
            width: 500, height: 500, marginLeft: -250, marginTop: -250,
            borderRadius: "50%",
            border: "1px solid rgba(6,182,212,0.08)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          {/* Orbiting dot on ring */}
          <div style={{
            position: "absolute", top: -4, left: "50%",
            width: 8, height: 8, borderRadius: "50%",
            background: "#7c3aed",
            boxShadow: "0 0 16px #7c3aed",
            transform: "translateX(-50%)",
          }} />
        </motion.div>
        {/* Small inner ring */}
        <motion.div
          style={{
            position: "absolute", top: "50%", left: "50%",
            width: 320, height: 320, marginLeft: -160, marginTop: -160,
            borderRadius: "50%",
            border: "1px dashed rgba(168,85,247,0.1)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        >
          <div style={{
            position: "absolute", bottom: -4, left: "50%",
            width: 7, height: 7, borderRadius: "50%",
            background: "#06b6d4",
            boxShadow: "0 0 14px #06b6d4",
            transform: "translateX(-50%)",
          }} />
        </motion.div>

        {/* Nebula blobs */}
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)",
          top: "-100px", left: "-100px",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)",
          bottom: "-80px", right: "-80px",
        }} />
      </div>

      {/* ── Auth card ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 40, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            style={{ marginBottom: 12 }}
          >
            <WalletWizzLogo size={64} glow />
          </motion.div>

          <div className="auth-title">WalletWizz</div>
          <div className="auth-subtitle">
            {isRegister ? "Join the cosmos — create your account" : "AI-Powered Financial Intelligence"}
          </div>
        </div>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="full_name" name="full_name" type="text"
                className="form-input" placeholder="Your full name"
                value={form.full_name} onChange={handleChange} required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="email" name="email" type="email"
              className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password" name="password" type="password"
              className="form-input" placeholder="••••••••"
              value={form.password} onChange={handleChange} required
            />
          </div>

          <motion.button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: 8 }}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Please wait…
              </span>
            ) : isRegister ? "🚀 Launch Account" : "⚡ Sign In"}
          </motion.button>
        </form>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-muted)" }}>
          {isRegister ? (
            <>Already have an account? <Link to="/login" style={{ color: "#a78bfa" }}>Sign in</Link></>
          ) : (
            <>Don't have an account? <Link to="/register" style={{ color: "#a78bfa" }}>Create one</Link></>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
