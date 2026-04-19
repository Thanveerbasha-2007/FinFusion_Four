import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import WalletWizzLogo from "./WalletWizzLogo";

const NAV = [
  { path: "/dashboard",       icon: "⬡", label: "Dashboard"    },
  { path: "/score",           icon: "◎", label: "Credit Score" },
  { path: "/personality",     icon: "◈", label: "Personality"  },
  { path: "/transactions",    icon: "≡", label: "Transactions" },
  { path: "/predictions",     icon: "⟁", label: "Predictions"  },
  { path: "/recommendations", icon: "✦", label: "Advice"       },
  { path: "/upload",          icon: "⊕", label: "Upload PDF"   },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <motion.div
        className="sidebar-logo"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", flexShrink: 0 }}
        >
          <WalletWizzLogo size={34} glow />
        </motion.div>
        WalletWizz
      </motion.div>

      {/* Nav links */}
      {NAV.map((item, i) => (
        <motion.div
          key={item.path}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * i + 0.1 }}
        >
          <NavLink
            to={item.path}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <span className="icon" style={{
              fontFamily: "monospace",
              fontSize: 15,
              background: "linear-gradient(135deg,#a78bfa,#67e8f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontWeight: 700,
            }}>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        </motion.div>
      ))}

      <div className="sidebar-spacer" />

      {/* User panel */}
      <motion.div
        className="sidebar-user"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {/* Orbit decoration */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 16px rgba(124,58,237,0.6)",
          }}>
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>
        <button
          className="btn btn-danger btn-sm"
          style={{ width: "100%" }}
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </motion.div>
    </aside>
  );
};

export default Sidebar;
