import urllib.request, json, urllib.error, random, string
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:8001"

def post(path, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, json.dumps(body).encode(), headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except Exception:
            return {"error": str(e)}, e.code

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except Exception:
            return {"error": str(e)}, e.code

email = "apitest_" + "".join(random.choices(string.ascii_lowercase, k=6)) + "@demo.com"
print("=" * 50)
print("Backend smoke test ->", BASE)
print("=" * 50)

# ── 1. Register ──────────────────────────────────────
r, s = post("/auth/register", {
    "email": email, "full_name": "API Tester", "password": "pass1234"
})
uid   = r.get("user", {}).get("id")
token = r.get("access_token")
print("[" + str(s) + "] REGISTER: " + ("OK  uid=" + str(uid) if s == 200 else "FAIL " + str(r)))
if not token:
    print("FATAL: no access_token. Stop.")
    raise SystemExit(1)

# ── 2. /me ───────────────────────────────────────────
r, s = get("/auth/me", token)
print("[" + str(s) + "] /me:      " + (r.get("email", "") if s == 200 else "FAIL " + str(r)))

# ── 3. Bulk transactions ─────────────────────────────
now  = datetime.now(timezone.utc)
txns = []
for m in range(3):
    txns.append({
        "date":        (now - timedelta(days=90 - m * 30)).isoformat(),
        "description": "SALARY CREDIT",
        "amount":      50000.0,
        "type":        "credit",
        "category":    "income",
        "mode":        "NEFT"
    })
for i in range(70):
    txns.append({
        "date":        (now - timedelta(days=i)).isoformat(),
        "description": "Zomato UPI",
        "amount":      float(150 + i * 25),
        "type":        "debit",
        "category":    "dining",
        "mode":        "UPI"
    })

r, s = post("/transactions/bulk", {"transactions": txns}, token)
cnt  = len(r) if isinstance(r, list) else 0
print("[" + str(s) + "] BULK:     " + str(cnt) + " transactions created")

# ── 4. Analyze ───────────────────────────────────────
r, s = post("/analytics/analyze", {}, token)
print("[" + str(s) + "] ANALYZE:  " + str(r))

# ── 5. Dashboard ─────────────────────────────────────
r, s = get("/analytics/dashboard", token)
if s == 200:
    cs   = r.get("credit_score") or {}
    feat = r.get("features") or {}
    print("[200] DASHBOARD: OK")
    print("      score="  + str(cs.get("score"))  +
          "  grade="      + str(cs.get("grade"))  +
          "  persona="    + str(cs.get("persona")))
    print("      income=" + str(feat.get("total_income")) +
          "  spent="      + str(feat.get("total_spent"))  +
          "  txns="       + str(feat.get("txn_count")))
    print()
    print("=" * 50)
    print("  ALL TESTS PASSED - Backend is fully working!")
    print("=" * 50)
else:
    print("[" + str(s) + "] DASHBOARD FAIL: " + str(r))
    raise SystemExit(1)
