import json
import pdfplumber
from app.services.parser import _parse_canara

path = r'C:\Users\Thanveer Basha\OneDrive\Desktop\coa online classes\Thanveer Canara.pdf'
with pdfplumber.open(path) as pdf:
    records = _parse_canara(pdf)

print(f'Total transactions: {len(records)}')
print('First 10 transactions:')
for r in records[:10]:
    print(f"{r['date']} | {r.get('type', '')} | {r.get('amount', 0)} | {r.get('description', '')[:40]}")

print('---')
print('Last 10 transactions:')
for r in records[-10:]:
    print(f"{r['date']} | {r.get('type', '')} | {r.get('amount', 0)} | {r.get('description', '')[:40]}")
