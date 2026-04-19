import sys
sys.path.insert(0, ".")

import jwt as pyjwt
from datetime import datetime, timedelta, timezone

SECRET = "finpersona-super-secret-key-2024"
ALGO   = "HS256"

# Create
payload = {"sub": 1, "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
token   = pyjwt.encode(payload, SECRET, algorithm=ALGO)
print("Token type:", type(token))
print("Token:", token[:60])

# Try decode with explicit error
try:
    dec = pyjwt.decode(token, SECRET, algorithms=[ALGO])
    print("Decoded OK:", dec)
except pyjwt.ExpiredSignatureError as e:
    print("EXPIRED:", e)
except pyjwt.InvalidTokenError as e:
    print("INVALID TOKEN:", type(e).__name__, e)
except Exception as e:
    print("OTHER:", type(e).__name__, e)

# Check PyJWT version
print("PyJWT version:", pyjwt.__version__)
