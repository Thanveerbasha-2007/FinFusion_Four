import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import SpaceBackground from "./components/SpaceBackground";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ScorePage from "./pages/ScorePage";
import PersonalityPage from "./pages/PersonalityPage";
import TransactionsPage from "./pages/TransactionsPage";
import PredictionsPage from "./pages/PredictionsPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import UploadPage from "./pages/UploadPage";
import "./index.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#01020a" }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <AuthPage mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <AuthPage mode="register" />} />
      <Route path="/dashboard"       element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/score"           element={<ProtectedRoute><AppLayout><ScorePage /></AppLayout></ProtectedRoute>} />
      <Route path="/personality"     element={<ProtectedRoute><AppLayout><PersonalityPage /></AppLayout></ProtectedRoute>} />
      <Route path="/transactions"    element={<ProtectedRoute><AppLayout><TransactionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/predictions"     element={<ProtectedRoute><AppLayout><PredictionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><AppLayout><RecommendationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/upload"          element={<ProtectedRoute><AppLayout><UploadPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global space canvas — rendered behind everything */}
        <SpaceBackground />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
