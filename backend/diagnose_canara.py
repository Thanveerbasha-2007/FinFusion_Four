"""
Canara Bank PDF Diagnostic Script
Run this with: python diagnose_canara.py <path_to_canara.pdf>

This shows EXACTLY what pdfplumber extracts so the parser can be built correctly.
"""
import sys
import pdfplumber
import json

def diagnose(pdf_path: str):
    print(f"\n{'='*70}")
    print(f"DIAGNOSING: {pdf_path}")
    print(f"{'='*70}\n")

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}\n")

        for page_num, page in enumerate(pdf.pages[:3], 1):  # First 3 pages
            print(f"\n{'─'*60}")
            print(f"PAGE {page_num}  (width={page.width:.1f}, height={page.height:.1f})")
            print(f"{'─'*60}")

            # 1. Raw text
            text = page.extract_text() or ""
            print("\n[RAW TEXT - first 800 chars]:")
            print(text[:800])

            # 2. Layout-preserved text
            try:
                layout_text = page.extract_text(layout=True) or ""
                print("\n[LAYOUT TEXT - first 1000 chars]:")
                print(layout_text[:1000])
            except Exception as e:
                print(f"Layout text failed: {e}")

            # 3. Tables
            tables = page.extract_tables()
            print(f"\n[TABLES FOUND: {len(tables)}]")
            for t_idx, table in enumerate(tables):
                print(f"\n  Table {t_idx+1}: {len(table)} rows x {len(table[0]) if table else 0} cols")
                for r_idx, row in enumerate(table[:8]):  # First 8 rows
                    print(f"  Row {r_idx:02d}: {[str(c or '')[:40] for c in row]}")

            # 4. Words with positions (first 20)
            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            print(f"\n[WORDS with positions - first 20]:")
            for w in words[:20]:
                print(f"  x0={w['x0']:6.1f} y0={w['top']:6.1f} | '{w['text']}'")

            print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python diagnose_canara.py <path_to_canara.pdf>")
        print("\nExample: python diagnose_canara.py canara_statement.pdf")
        sys.exit(1)
    diagnose(sys.argv[1])
