// Centralized API service — all backend calls go through here
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

const getAuthHeaders = () => {
  const token = localStorage.getItem("fp_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getAuthHeaders(),
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────
export const registerUser = (body) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const loginUser = (body) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(body) });

export const getMe = () => request("/auth/me");

// ─── Transactions ──────────────────────────────────────────────────
export const getTransactions = (skip = 0, limit = 100) =>
  request(`/transactions/?skip=${skip}&limit=${limit}`);

export const createTransaction = (body) =>
  request("/transactions/", { method: "POST", body: JSON.stringify(body) });

export const bulkCreateTransactions = (transactions) =>
  request("/transactions/bulk", { method: "POST", body: JSON.stringify({ transactions }) });

export const deleteTransaction = (id) =>
  request(`/transactions/${id}`, { method: "DELETE" });

// ─── Analytics ─────────────────────────────────────────────────────
export const getDashboard = () => request("/analytics/dashboard");

export const runAnalysis = () =>
  request("/analytics/analyze", { method: "POST" });

export const uploadPDF = (file) => {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${BASE_URL}/analytics/upload-pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("fp_token")}` },
    body: form,
  }).then((r) => r.json());
};
