import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTransactions, createTransaction, deleteTransaction } from "../services/api";

const CATEGORIES = ["groceries","dining","shopping","transportation","entertainment","utilities","income","other"];
const MODES      = ["UPI","NEFT","IMPS","CARD","ATM","BANK"];

const BLANK = {
  date: new Date().toISOString().slice(0,16),
  description: "",
  amount: "",
  type: "debit",
  category: "other",
  mode: "UPI",
};

const TransactionsPage = () => {
  const [txns,    setTxns]    = useState([]);
  const [form,    setForm]    = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState("all");
  const [msg,     setMsg]     = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setTxns(await getTransactions(0, 200)); }
    catch (e) { setMsg("❌ " + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      await createTransaction({ ...form, amount: parseFloat(form.amount), date: new Date(form.date).toISOString() });
      setForm(BLANK);
      setShowForm(false);
      await load();
      setMsg("✅ Transaction added!");
    } catch (err) { setMsg("❌ " + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setTxns(t => t.filter(x => x.id !== id));
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const filtered = filter === "all" ? txns
    : txns.filter(t => t.type === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Transactions 💳</h1>
            <p className="page-subtitle">{txns.length} transactions · Manage your financial records</p>
          </div>
          <button id="add-txn-btn" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Close" : "+ Add Transaction"}
          </button>
        </div>
        {msg && <div className={`alert mt-16 ${msg.startsWith("✅") ? "alert-success" : "alert-error"}`}>{msg}</div>}
      </div>

      {/* Add Form */}
      {showForm && (
        <motion.div className="card" style={{ marginBottom: 24 }}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-title">➕ Add Transaction</div>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input id="txn-date" name="date" type="datetime-local" className="form-input"
                value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input id="txn-desc" name="description" className="form-input" placeholder="e.g. Zomato order"
                value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input id="txn-amount" name="amount" type="number" min="0" step="0.01" className="form-input" placeholder="500"
                value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select id="txn-type" className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="debit">Debit (Expense)</option>
                <option value="credit">Credit (Income)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select id="txn-category" className="form-input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mode</label>
              <select id="txn-mode" className="form-input" value={form.mode} onChange={e => setForm(f => ({...f, mode: e.target.value}))}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}>
              <button id="save-txn-btn" type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Transaction"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all","credit","debit"].map(f => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>
            {f === "all" ? "All" : f === "credit" ? "💰 Income" : "💸 Expenses"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Category</th><th>Mode</th><th>Amount</th><th>Type</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No transactions found.</td></tr>
                ) : filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                    <td><span style={{ textTransform: "capitalize" }}>{t.category}</span></td>
                    <td><span className={`badge ${t.mode === "UPI" ? "badge-upi" : ""}`}>{t.mode}</span></td>
                    <td style={{ fontWeight: 700, color: t.type === "credit" ? "var(--green)" : "var(--red)" }}>
                      {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                    </td>
                    <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TransactionsPage;
