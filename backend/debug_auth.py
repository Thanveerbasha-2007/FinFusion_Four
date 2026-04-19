import sys
sys.path.insert(0, ".")

# Test auth_service directly
from app.services.auth_service import create_access_token, decode_token, get_password_hash, verify_password

print("=== Auth Service Debug ===")
h = get_password_hash("hello")
print("hash:", h[:20])
print("verify:", verify_password("hello", h))

tok = create_access_token({"sub": 1})
print("token:", tok[:50])

dec = decode_token(tok)
print("decoded:", dec)

# Also test the OAuth2 bearer extraction that FastAPI uses
import urllib.request, json, urllib.error

BASE = "http://localhost:8001"

# Register
req = urllib.request.Request(
    BASE + "/auth/register",
    json.dumps({"email": "dbg@test.com", "full_name": "Dbg", "password": "test1234"}).encode(),
    {"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
        print("\nRegister token from API:", data["access_token"][:50])
        api_token = data["access_token"]
except urllib.error.HTTPError as e:
    print("Register failed:", e.code, e.read())
    sys.exit(1)

# Try decoding the API token locally
dec2 = decode_token(api_token)
print("Decode API token locally:", dec2)

# Try /me
req2 = urllib.request.Request(
    BASE + "/auth/me",
    headers={"Authorization": "Bearer " + api_token}
)
try:
    with urllib.request.urlopen(req2, timeout=10) as r:
        print("/me:", json.loads(r.read()))
except urllib.error.HTTPError as e:
    body = e.read()
    print("/me FAILED:", e.code, body)
