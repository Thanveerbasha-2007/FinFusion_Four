"""
Universal Bank Statement PDF Parser  v3
Supports: Canara Bank, PhonePe, HDFC, SBI, ICICI, Axis, generic formats.

Canara Bank parsing strategy:
  - Uses pdfplumber word-level bounding boxes to reconstruct the table.
  - Each word has an (x0, top) coordinate. We cluster words into rows by
    vertical proximity, then assign each row-word to a column by x0 range.
  - Column boundaries are auto-detected from the header row.
  - Consecutive rows with NO date in col_date are merged into the previous
    transaction's description (multi-line Particulars).
  
Canara Bank PDF layout (from real statement):
  Columns:  Date | Particulars | Deposits | Withdrawals | Balance
  Date fmt: DD-MM-YYYY  (e.g. 22-08-2025)
  Deposits  = credit amount
  Withdrawals = debit amount
"""

import pdfplumber
import re
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any


# ─── Constants ────────────────────────────────────────────────────────────────
RE_DATE_DMY  = re.compile(r'\b(\d{2})[/\-\.](\d{2})[/\-\.](\d{4})\b')
RE_DATE_LONG = re.compile(
    r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b',
    re.IGNORECASE
)
RE_TIME    = re.compile(r'\b(\d{1,2}:\d{2}\s*(?:am|pm))\b', re.IGNORECASE)
RE_TXN_ID  = re.compile(r'\bT\d{15,}\b')
RE_NUM     = re.compile(r'^\d[\d,]*\.?\d*$')  # pure number like 1,00,000.00

SKIP_CONTAINS = {
    "OPENING BALANCE", "CLOSING BALANCE", "BROUGHT FORWARD", "CARRIED FORWARD"
}
SKIP_EXACT = {
    "DATE", "PARTICULARS", "NARRATION", "DEPOSITS", "WITHDRAWALS", "BALANCE", 
    "DESCRIPTION", "DR", "CR", "AMOUNT", "STATEMENT", "PAGE", "TRANSACTION", 
    "CREDIT", "DEBIT", "REF NO", "CHQ NO", "VALUE DATE", "TOTAL"
}


# ─── Category & Mode ──────────────────────────────────────────────────────────
_CATEGORY_RULES = [
    ("income",         ["SALARY", "PAYROLL", "BONUS", "INCENTIVE", "DIVIDEND",
                        "INTEREST CREDITED", "INTEREST CR", "FD INTEREST",
                        "PENSION", "MATURITY", "ARREARS", "STIPEND"]),
    ("dining",         ["ZOMATO", "SWIGGY", "BLINKIT", "FOOD", "RESTAURANT",
                        "CAFE", "PIZZA", "BURGER", "BIRYANI", "DHABA"]),
    ("shopping",       ["AMAZON", "FLIPKART", "MYNTRA", "AJIO", "MEESHO",
                        "NYKAA", "ZEPTO", "MALL", "SHOPPING", "STORE"]),
    ("transportation", ["OLA", "UBER", "RAPIDO", "METRO", "IRCTC", "PETROL",
                        "FUEL", "BUS", "TRAIN", "FLIGHT", "INDIGO", "REDBUS"]),
    ("entertainment",  ["NETFLIX", "SPOTIFY", "HOTSTAR", "PRIME", "DISNEY",
                        "YOUTUBE", "CINEMA", "PVR", "INOX", "BOOKMYSHOW"]),
    ("utilities",      ["ELECTRICITY", "BESCOM", "TNEB", "MSEDCL", "WATER",
                        "GAS", "AIRTEL", "JIO", "BSNL", "BROADBAND", "DTH",
                        "RECHARGE", "BILL", "GOOGLE", "AUTOPAY",
                        "MSEB", "CESC", "APSPDCL", "TSSPDCL"]),
    ("groceries",      ["BIGBASKET", "DMART", "KIRANA", "GROCER", "SUPERMARKET",
                        "RELIANCE SMART", "FRESH", "MILK", "VEGETABLES"]),
    ("health",         ["PHARMACY", "MEDICAL", "APOLLO", "NETMEDS", "1MG",
                        "HOSPITAL", "CLINIC", "DOCTOR"]),
    ("education",      ["SCHOOL", "COLLEGE", "TUITION", "COURSE", "UDEMY",
                        "BYJU", "FEE", "INSTITUTION"]),
    ("emi",            ["EMI", "LOAN", "HOME LOAN", "PERSONAL LOAN", "CAR LOAN"]),
    ("transfer",       ["NEFT", "RTGS", "IMPS", "UPI", "TRANSFER",
                        "SEND MONEY", "PAID TO", "RECEIVED FROM"]),
]


def _detect_category(desc: str, txn_type: str) -> str:
    d = desc.upper()
    if txn_type == "credit":
        if any(k in d for k in ["SALARY", "PAYROLL", "BONUS", "INCENTIVE",
                                  "DIVIDEND", "INTEREST", "FD", "PENSION",
                                  "ARREARS", "MATURITY"]):
            return "income"
        return "income"  # most credits are income/transfers
    for cat, kws in _CATEGORY_RULES:
        if any(k in d for k in kws):
            return cat
    return "other"


def _detect_mode(desc: str, extra: str = "") -> str:
    c = (desc + " " + extra).upper()
    if RE_TXN_ID.search(c):   return "UPI"
    if "NEFT"    in c:        return "NEFT"
    if "RTGS"    in c:        return "RTGS"
    if "IMPS"    in c:        return "IMPS"
    if "UPI"     in c:        return "UPI"
    if "ATM"     in c:        return "ATM"
    if "CARD"    in c or "POS" in c: return "CARD"
    if "AUTOPAY" in c:        return "CARD"
    if "CHEQUE"  in c or "CHQ" in c: return "CHEQUE"
    return "BANK"


def _clean_amount(text: str) -> float:
    s = re.sub(r'[₹\u20b9\s,]', '', str(text or ""))
    s = re.sub(r'[^\d.]', '', s)
    if not s or s == '.':
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_date(text: str) -> Optional[datetime]:
    text = str(text or "").strip()
    m = RE_DATE_DMY.search(text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return datetime(y, mo, d)
        except ValueError:
            pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y",
                "%Y-%m-%d", "%d %b %Y", "%d %b %y", "%b %d %Y", "%d %B %Y"):
        try:
            return datetime.strptime(re.sub(r'\s+', ' ', text.replace(',', '')), fmt)
        except Exception:
            continue
    try:
        dt = pd.to_datetime(text, dayfirst=True)
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except Exception:
        return None


def _detect_bank(text: str) -> str:
    t = text.upper()
    if "CANARA BANK" in t or "CANARA" in t:
        return "canara"
    if ("TRANSACTION ID" in t or RE_TXN_ID.search(t)) and "UTR" in t:
        return "phonepe"
    if "HDFC BANK" in t:   return "hdfc"
    if "STATE BANK OF INDIA" in t: return "sbi"
    if "ICICI BANK" in t:  return "icici"
    if "AXIS BANK" in t:   return "axis"
    if "KOTAK" in t:       return "kotak"
    return "generic"


# ─── CANARA BANK — Word-level bounding-box parser ─────────────────────────────

def _parse_canara(pdf) -> List[Dict]:
    """
    Canara Bank parser using word bounding boxes.
    Most reliable approach for multi-line cells.
    """
    all_records: List[Dict] = []

    for page in pdf.pages:
        records = _parse_canara_page(page)
        all_records.extend(records)

    return all_records


def _parse_canara_page(page) -> List[Dict]:
    """Parse one Canara Bank PDF page using word positions."""

    # Extract all words with positions
    words = page.extract_words(
        x_tolerance=5,
        y_tolerance=5,
        keep_blank_chars=False,
        use_text_flow=False,
    )
    if not words:
        return []

    page_width = page.width

    # ── Step 1: Cluster words into lines by Y position ─────────────────────────
    # Words within 6pt of each other vertically = same line
    lines: List[List[Dict]] = []
    for w in sorted(words, key=lambda x: (round(x['top'] / 6), x['x0'])):
        placed = False
        for line in lines:
            if abs(line[0]['top'] - w['top']) <= 6:
                line.append(w)
                placed = True
                break
        if not placed:
            lines.append([w])

    # Sort each line left-to-right
    for line in lines:
        line.sort(key=lambda w: w['x0'])

    # ── Step 2: Find header line to detect column boundaries ──────────────────
    col_date_x   = (0,            page_width * 0.14)   # 0–14% default
    col_desc_x   = (page_width * 0.14, page_width * 0.62)  # 14–62%
    col_dep_x    = (page_width * 0.62, page_width * 0.74)  # 62–74%
    col_wdr_x    = (page_width * 0.74, page_width * 0.86)  # 74–86%
    # col_bal is the rest — we don't use it

    for line in lines:
        line_text = " ".join(w['text'].upper() for w in line)
        if "DATE" in line_text and (
            "DEPOSIT" in line_text or "WITHDRAWAL" in line_text
            or "PARTICULAR" in line_text or "NARRATION" in line_text
        ):
            headers = {}
            for w in line:
                t = w['text'].upper()
                if "DATE" in t: headers["date"] = w['x0']
                elif "PARTICULAR" in t or "NARRATION" in t or "DESCRIPTION" in t: headers["desc"] = w['x0']
                elif "DEPOSIT" in t or "CREDIT" in t: headers["dep"] = w['x0']
                elif "WITHDRAWAL" in t or "DEBIT" in t: headers["wdr"] = w['x0']
                elif "BALANCE" in t: headers["bal"] = w['x0']
                
            if "date" in headers and "desc" in headers:
                col_date_x = (headers["date"] - 10, headers["desc"] - 5)
            if "desc" in headers and "dep" in headers:
                # End desc much earlier so it doesn't swallow large deposit numbers
                col_desc_x = (headers["desc"] - 5, headers["dep"] - 45)
            if "dep" in headers and "wdr" in headers:
                # Right aligned numbers mean they start to the left of the header
                col_dep_x = (headers["dep"] - 45, headers["wdr"] - 45)
            if "wdr" in headers and "bal" in headers:
                col_wdr_x = (headers["wdr"] - 45, headers["bal"] - 45)
            elif "wdr" in headers:
                col_wdr_x = (headers["wdr"] - 45, headers["wdr"] + page_width * 0.15)
            break

    def get_col(word: Dict) -> str:
        x = word['x0']
        if col_date_x[0] <= x <= col_date_x[1]:    return "date"
        if col_desc_x[0] <= x <= col_desc_x[1]:    return "desc"
        if col_dep_x[0]  <= x <= col_dep_x[1]:     return "dep"
        if col_wdr_x[0]  <= x <= col_wdr_x[1]:     return "wdr"
        return "other"

    # ── Step 3: Build cell text per column per line ───────────────────────────
    structured: List[Dict[str, str]] = []
    for line in lines:
        cells: Dict[str, List[str]] = {"date": [], "desc": [], "dep": [], "wdr": []}
        for w in line:
            col = get_col(w)
            if col in cells:
                cells[col].append(w['text'])
        structured.append({
            "date": " ".join(cells["date"]).strip(),
            "desc": " ".join(cells["desc"]).strip(),
            "dep":  " ".join(cells["dep"]).strip(),
            "wdr":  " ".join(cells["wdr"]).strip(),
        })

    # ── Step 4: Group lines into transactions ─────────────────────────────────
    # A new transaction begins when the date cell contains a valid date.
    # Continuation lines have an empty date cell.
    grouped: List[Dict[str, Any]] = []

    for row in structured:
        date_val = _parse_date(row["date"])
        desc_text = row["desc"].strip()
        dep_amt   = _clean_amount(row["dep"])
        wdr_amt   = _clean_amount(row["wdr"])

        # Skip obvious header / summary rows
        desc_upper = desc_text.upper()
        date_upper = row["date"].upper()
        
        if desc_upper in SKIP_EXACT or date_upper in SKIP_EXACT:
            continue
        if any(s in desc_upper for s in SKIP_CONTAINS):
            continue

        if date_val:
            # New transaction
            grouped.append({
                "date":      date_val,
                "desc_parts": [desc_text] if desc_text else [],
                "dep":       dep_amt,
                "wdr":       wdr_amt,
            })
        else:
            # Continuation — append description; pick up amounts if missing
            if grouped:
                if desc_text and desc_text.upper() not in SKIP_EXACT:
                    grouped[-1]["desc_parts"].append(desc_text)
                if grouped[-1]["dep"] == 0.0 and dep_amt > 0:
                    grouped[-1]["dep"] = dep_amt
                if grouped[-1]["wdr"] == 0.0 and wdr_amt > 0:
                    grouped[-1]["wdr"] = wdr_amt

    # ── Step 5: Convert to records ─────────────────────────────────────────────
    records: List[Dict] = []
    for g in grouped:
        dep, wdr = g["dep"], g["wdr"]
        if dep == 0.0 and wdr == 0.0:
            continue

        if dep > 0 and wdr == 0:
            txn_type, amount = "credit", dep
        elif wdr > 0 and dep == 0:
            txn_type, amount = "debit", wdr
        elif dep > 0 and wdr > 0:
            # Both populated — take the larger as primary
            if dep >= wdr:
                txn_type, amount = "credit", dep
            else:
                txn_type, amount = "debit", wdr
        else:
            continue

        desc = " | ".join(p for p in g["desc_parts"] if p and len(p) > 1)
        desc = desc[:255] or "Canara Bank Transaction"

        records.append({
            "date":        g["date"].isoformat(),
            "description": desc,
            "amount":      amount,
            "type":        txn_type,
            "mode":        _detect_mode(desc),
            "category":    _detect_category(desc, txn_type),
        })

    # ── Step 6: Fallback to extract_tables if word approach got nothing ────────
    if not records:
        records = _parse_canara_table_fallback(page)

    return records


def _parse_canara_table_fallback(page) -> List[Dict]:
    """Fallback: use pdfplumber table extraction for Canara Bank page."""
    records: List[Dict] = []

    for table in (page.extract_tables() or []):
        if not table or len(table) < 2:
            continue

        # Find header
        header_idx = 0
        col_date, col_desc, col_dep, col_wdr = 0, 1, 2, 3
        for i, row in enumerate(table):
            joined = " ".join(str(c or "").upper() for c in row)
            if "DATE" in joined and ("DEPOSIT" in joined or "WITHDRAWAL" in joined):
                header_idx = i
                cells = [str(c or "").upper().strip() for c in row]
                for j, c in enumerate(cells):
                    if "DATE" in c:       col_date = j
                    elif "PARTICULAR" in c or "NARRATION" in c: col_desc = j
                    elif "DEPOSIT" in c or "CREDIT" in c:       col_dep  = j
                    elif "WITHDRAWAL" in c or "DEBIT" in c:     col_wdr  = j
                break

        current = None
        for row in table[header_idx + 1:]:
            if not row:
                continue
            cells = [str(c or "").strip() for c in row]
            while len(cells) < max(col_date, col_desc, col_dep, col_wdr) + 1:
                cells.append("")

            joined = " ".join(cells).upper()
            if any(s in joined for s in SKIP_ROWS):
                continue

            date_val = _parse_date(cells[col_date])
            dep_amt  = _clean_amount(cells[col_dep])
            wdr_amt  = _clean_amount(cells[col_wdr])
            desc_txt = cells[col_desc][:200]

            if date_val:
                if current and (current["dep"] > 0 or current["wdr"] > 0):
                    records.append(_make_record(current))
                current = {"date": date_val, "desc_parts": [desc_txt],
                           "dep": dep_amt, "wdr": wdr_amt}
            elif current:
                if desc_txt:
                    current["desc_parts"].append(desc_txt)
                if current["dep"] == 0 and dep_amt > 0:
                    current["dep"] = dep_amt
                if current["wdr"] == 0 and wdr_amt > 0:
                    current["wdr"] = wdr_amt

        if current and (current["dep"] > 0 or current["wdr"] > 0):
            records.append(_make_record(current))

    return records


def _make_record(g: Dict) -> Dict:
    dep, wdr = g["dep"], g["wdr"]
    if dep > 0 and wdr == 0:
        txn_type, amount = "credit", dep
    elif wdr > 0:
        txn_type, amount = "debit", wdr
    else:
        txn_type, amount = "debit", max(dep, wdr)
    desc = " | ".join(p for p in g["desc_parts"] if p and len(p) > 1)[:255] or "Canara Bank Transaction"
    return {
        "date":        g["date"].isoformat(),
        "description": desc,
        "amount":      amount,
        "type":        txn_type,
        "mode":        _detect_mode(desc),
        "category":    _detect_category(desc, txn_type),
    }


# ─── PhonePe Parser ────────────────────────────────────────────────────────────

def _parse_phonepe(pdf) -> List[Dict]:
    records = []
    for page in pdf.pages:
        records.extend(_parse_phonepe_text(page.extract_text() or ""))
    return records


def _parse_phonepe_text(text: str) -> List[Dict]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    date_positions = []
    for i, line in enumerate(lines):
        m = RE_DATE_LONG.search(line)
        if m:
            date_positions.append((i, m))
    if not date_positions:
        return []

    records = []
    for idx, (pos, dm) in enumerate(date_positions):
        end        = date_positions[idx + 1][0] if idx + 1 < len(date_positions) else len(lines)
        block      = lines[pos:end]
        block_text = " ".join(block)
        try:
            month_num = datetime.strptime(dm.group(1), "%b").month
            day, year = int(dm.group(2)), int(dm.group(3))
            hour = minute = 0
            tm = RE_TIME.search(block_text)
            if tm:
                try:
                    t = datetime.strptime(tm.group(1).lower().replace(" ", ""), "%I:%M%p")
                    hour, minute = t.hour, t.minute
                except Exception:
                    pass
            dt = datetime(year, month_num, day, hour, minute)

            is_credit = bool(re.search(r'\bCREDIT\b', block_text, re.IGNORECASE))
            is_debit  = bool(re.search(r'\bDEBIT\b',  block_text, re.IGNORECASE))
            if is_credit and not is_debit:
                txn_type = "credit"
            elif "RECEIVED FROM" in block_text.upper():
                txn_type = "credit"
            else:
                txn_type = "debit"

            amounts = re.findall(r'[₹\u20b9]([\d,]+(?:\.\d+)?)', block_text)
            if not amounts:
                continue
            amount = float(amounts[-1].replace(",", ""))
            if amount <= 0:
                continue

            description = ""
            for line in block:
                if (RE_DATE_LONG.search(line) or RE_TIME.search(line)
                        or line.startswith("Transaction ID") or line.startswith("UTR No")
                        or "Paid by" in line or "Credited to" in line
                        or line.upper() in ("DEBIT", "CREDIT")
                        or re.search(r'[₹\u20b9]', line) or len(line) < 3):
                    continue
                description = line[:120]
                break

            records.append({
                "date":        dt.isoformat(),
                "description": description or "Transaction",
                "amount":      amount,
                "type":        txn_type,
                "mode":        _detect_mode(description, block_text),
                "category":    _detect_category(description, txn_type),
            })
        except Exception:
            continue
    return records


# ─── Generic Table Parser ─────────────────────────────────────────────────────

def _parse_generic(pdf) -> List[Dict]:
    records = []
    for page in pdf.pages:
        for table in (page.extract_tables() or []):
            if table and len(table) > 1:
                records.extend(_parse_generic_rows(table[1:]))
    return records


def _parse_generic_rows(rows: List[List]) -> List[Dict]:
    records = []
    for row in rows:
        cells     = [str(c or "").strip() for c in row]
        non_empty = [c for c in cells if c]
        if len(non_empty) < 3:
            continue
        joined = " ".join(cells).upper()
        if any(s in joined for s in SKIP_ROWS):
            continue

        date_val = None
        for cell in cells:
            d = _parse_date(cell)
            if d:
                date_val = d
                break
        if not date_val:
            continue

        amounts = [_clean_amount(c) for c in cells if _clean_amount(c) > 0]
        if not amounts:
            continue

        txn_type = "credit" if ("CR" in joined or "CREDIT" in joined) else "debit"
        amount   = amounts[-1] if txn_type == "credit" else amounts[0]

        desc = ""
        for cell in cells:
            if len(cell) > 4 and not re.match(r'^[\d₹,.\-\s/]+$', cell) and not _parse_date(cell):
                desc = cell[:200]
                break

        records.append({
            "date":        date_val.isoformat(),
            "description": desc or "Bank Transaction",
            "amount":      amount,
            "type":        txn_type,
            "mode":        _detect_mode(desc, joined),
            "category":    _detect_category(desc, txn_type),
        })
    return records


# ─── Public API ───────────────────────────────────────────────────────────────

def parse_bank_statement(file_path: str) -> pd.DataFrame:
    """
    Parse any supported bank PDF statement.
    Returns a clean DataFrame with columns:
      date, description, amount, type, mode, category
    Attaches df.attrs['bank'] with detected bank name.
    """
    all_records: List[Dict] = []
    bank = "generic"

    with pdfplumber.open(file_path) as pdf:
        sample = "\n".join((p.extract_text() or "") for p in pdf.pages[:5])
        bank   = _detect_bank(sample)

        if bank == "canara":
            all_records = _parse_canara(pdf)
        elif bank == "phonepe":
            all_records = _parse_phonepe(pdf)
        else:
            all_records = _parse_generic(pdf)

    # ── Fallback chain if primary parser returns nothing ──────────────────────
    if not all_records:
        with pdfplumber.open(file_path) as pdf:
            all_records = _parse_canara(pdf)

    if not all_records:
        with pdfplumber.open(file_path) as pdf:
            all_records = _parse_phonepe(pdf)

    if not all_records:
        with pdfplumber.open(file_path) as pdf:
            all_records = _parse_generic(pdf)

    if not all_records:
        return pd.DataFrame()

    df = pd.DataFrame(all_records)
    df["date"]   = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df = df.dropna(subset=["date"])
    df = df[df["amount"] > 0]
    df = df.drop_duplicates(subset=["date", "description", "amount"])
    df = df.sort_values("date").reset_index(drop=True)
    df.attrs["bank"] = bank.title()
    return df
