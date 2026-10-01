"""
GST JSON Generator
Generates GSTR-1 and GSTR-3B JSON files exactly as per GST Portal schema
for direct upload to gstin.gov.in
"""
import json, re
from datetime import datetime
from flask import send_file
import io


# ── Validation helpers ──────────────────────────────────────────
def validate_gstin(gstin):
    if not gstin: return False
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, str(gstin).upper()))

def validate_hsn(hsn):
    return len(str(hsn).strip()) in [4, 6, 8]

def validate_invoice_no(inv):
    return bool(inv) and len(str(inv)) <= 16

def fmt_money(val, dec=2):
    try: return round(float(val or 0), dec)
    except: return 0.0

def ret_period(year, month):
    """Return period in MMYYYY format as required by GST portal"""
    return f"{int(month):02d}{int(year)}"


# ── GSTR-1 JSON Generator ───────────────────────────────────────
def generate_gstr1_json(df_gstr1, df_hsn, gstin, year, month):
    """
    Generate GSTR-1 JSON as per GST Portal schema v1.3
    Sections: B2B, B2CS, B2CL, CDNR, HSN, DOC
    """
    errors = []
    warnings = []

    # Validate GSTIN
    if not validate_gstin(gstin):
        errors.append(f"Invalid GSTIN: {gstin}")

    # ── B2CS (B2C Small - unregistered, bill < 2.5L) ────────────
    b2cs_data = []
    if not df_gstr1.empty:
        b2cs_rows = df_gstr1[df_gstr1['INVOICE_TYPE']=='B2CS'] if 'INVOICE_TYPE' in df_gstr1.columns else df_gstr1
        for _, row in b2cs_rows.iterrows():
            taxable = fmt_money(row.get('TAXABLE_VALUE',0))
            igst    = fmt_money(row.get('IGST',0))
            cgst    = fmt_money(row.get('CGST',0))
            sgst    = fmt_money(row.get('SGST',0))
            cess    = fmt_money(row.get('CESS',0))
            rate    = fmt_money(row.get('GST_RATE',0), 0)
            if taxable == 0: continue
            b2cs_data.append({
                "rt": rate, "typ": "OE",
                "txval": taxable,
                "iamt": igst, "camt": cgst, "samt": sgst, "csamt": cess
            })

    # ── HSN Summary ──────────────────────────────────────────────
    hsn_data = []
    hsn_num = 1
    if not df_hsn.empty:
        for _, row in df_hsn.iterrows():
            hsn = str(row.get('HSN_CODE','')).strip()
            if not validate_hsn(hsn):
                warnings.append(f"Invalid HSN: {hsn} - skipping")
                continue
            taxable = fmt_money(row.get('NET_TAXABLE_VALUE',0))
            if taxable == 0: continue
            hsn_data.append({
                "num": hsn_num,
                "hsn_sc": hsn,
                "desc": str(row.get('ITEM_HSN',hsn)),
                "uqc": str(row.get('UOM','NOS')).upper()[:3],
                "qty": fmt_money(row.get('TOTAL_QTY',0)),
                "val": fmt_money(row.get('TOTAL_VALUE',0)),
                "txval": taxable,
                "iamt": fmt_money(row.get('IGST_AMT',0)),
                "camt": fmt_money(row.get('CGST_AMT',0)),
                "samt": fmt_money(row.get('SGST_AMT',0)),
                "csamt": fmt_money(row.get('CESS_AMT',0))
            })
            hsn_num += 1

    # ── Document Summary ─────────────────────────────────────────
    total_bills  = int(df_gstr1['BILL_NO'].nunique()) if not df_gstr1.empty and 'BILL_NO' in df_gstr1.columns else 0
    total_tax    = fmt_money(df_gstr1['TOTAL_GST'].sum()) if not df_gstr1.empty and 'TOTAL_GST' in df_gstr1.columns else 0
    total_taxable= fmt_money(df_gstr1['TAXABLE_VALUE'].sum()) if not df_gstr1.empty and 'TAXABLE_VALUE' in df_gstr1.columns else 0

    gstr1_json = {
        "version": "GST3.0.4",
        "hash": "hash",
        "gstin": gstin.upper(),
        "fp": ret_period(year, month),
        "gt": fmt_money(df_gstr1['INVOICE_VALUE'].sum()) if not df_gstr1.empty and 'INVOICE_VALUE' in df_gstr1.columns else 0,
        "cur_gt": fmt_money(df_gstr1['INVOICE_VALUE'].sum()) if not df_gstr1.empty and 'INVOICE_VALUE' in df_gstr1.columns else 0,
        "b2b": [],         # B2B - registered buyers (needs buyer GSTIN, add if available)
        "b2cl": [],        # B2CL - Large unregistered > 2.5L
        "b2cs": b2cs_data, # B2CS - Small unregistered
        "cdnr": [],        # Credit/Debit notes registered
        "cdnur": [],       # Credit/Debit notes unregistered
        "exp": [],         # Exports
        "nil": {           # Nil rated / exempt
            "inv": []
        },
        "hsn": {
            "data": hsn_data
        },
        "doc": {
            "doc_det": [
                {
                    "doc_num": 1,
                    "docs": [{"num": 1, "from": "1", "to": str(total_bills),
                              "totnum": total_bills, "cancel": 0, "net_issue": total_bills}]
                }
            ]
        }
    }

    return gstr1_json, errors, warnings


# ── GSTR-3B JSON Generator ───────────────────────────────────────
def generate_gstr3b_json(df_3b, gstin, year, month):
    """
    Generate GSTR-3B JSON as per GST Portal schema
    Table 3.1, 3.2, 4, 5, 6
    """
    errors = []
    if not validate_gstin(gstin):
        errors.append(f"Invalid GSTIN: {gstin}")

    if df_3b.empty:
        errors.append("No data for selected period")
        return {}, errors, []

    row = df_3b.iloc[0]  # Monthly summary row

    # Table 3.1 - Outward supplies
    taxable_val  = fmt_money(row.get('TAXABLE_OUTWARD', 0))
    igst_out     = fmt_money(row.get('IGST_SALES', 0))
    cgst_out     = fmt_money(row.get('CGST_SALES', 0))
    sgst_out     = fmt_money(row.get('SGST_SALES', 0))
    cess_out     = fmt_money(row.get('CESS_SALES', 0))
    nil_val      = fmt_money(row.get('NIL_RATED_SALES', 0))

    # Table 4 - ITC
    itc_eligible = fmt_money(row.get('ITC_ELIGIBLE', 0))
    itc_cgst     = fmt_money(row.get('ITC_CGST', 0))
    itc_sgst     = fmt_money(row.get('ITC_SGST', 0))
    net_liability= fmt_money(row.get('NET_TAX_LIABILITY', 0))

    gstr3b_json = {
        "gstin": gstin.upper(),
        "ret_period": ret_period(year, month),
        "inward_sup": {
            "isup_details": [
                {
                    "ty": "GST",      # GST = registered
                    "intra": fmt_money(0),
                    "inter": fmt_money(0)
                },
                {
                    "ty": "NONGST",
                    "intra": fmt_money(0),
                    "inter": fmt_money(0)
                }
            ]
        },
        "sup_details": {
            "osup_det": {             # 3.1(a) taxable outward
                "txval": taxable_val,
                "iamt": igst_out, "camt": cgst_out,
                "samt": sgst_out, "csamt": cess_out
            },
            "osup_zero": {            # 3.1(b) zero rated
                "txval": 0, "iamt": 0, "camt": 0, "samt": 0, "csamt": 0
            },
            "osup_nil_exmp": {        # 3.1(c) nil/exempt
                "txval": nil_val
            },
            "isup_rev": {             # 3.1(d) inward RCM
                "txval": 0, "iamt": 0, "camt": 0, "samt": 0, "csamt": 0
            },
            "osup_nongst": {          # 3.1(e) non-GST
                "txval": 0
            }
        },
        "inter_sup": {                # 3.2 interstate
            "unreg_details": [],
            "comp_details": [],
            "uin_details": []
        },
        "itc_elg": {                  # Table 4: ITC eligible
            "itc_avl": [
                {"ty": "IMPG", "iamt": 0, "camt": 0, "samt": 0, "csamt": 0},
                {"ty": "IMPS", "iamt": 0, "camt": 0, "samt": 0, "csamt": 0},
                {"ty": "ISRC", "iamt": 0, "camt": itc_cgst, "samt": itc_sgst, "csamt": 0},
                {"ty": "ISD",  "iamt": 0, "camt": 0, "samt": 0, "csamt": 0},
                {"ty": "OTH",  "iamt": 0, "camt": 0, "samt": 0, "csamt": 0}
            ],
            "itc_rev": [
                {"ty": "RUL", "iamt": 0, "camt": 0, "samt": 0, "csamt": 0},
                {"ty": "OTH", "iamt": 0, "camt": 0, "samt": 0, "csamt": 0}
            ],
            "itc_net": {"iamt": 0, "camt": itc_cgst, "samt": itc_sgst, "csamt": 0},
            "itc_inelg": [
                {"ty": "RUL", "iamt": 0, "camt": 0, "samt": 0, "csamt": fmt_money(row.get('ITC_INELIGIBLE',0))}
            ]
        },
        "intr_ltfee": {               # Table 5: Interest & late fee
            "intr_details": {
                "iamt": 0, "camt": 0, "samt": 0, "csamt": 0
            },
            "fee_details": {
                "iamt": 0, "camt": 0, "samt": 0, "csamt": 0
            }
        }
    }

    warnings = []
    if net_liability < 0:
        warnings.append(f"Net tax liability is negative (₹{net_liability:,.2f}) - ITC exceeds output tax. Review before filing.")
    if taxable_val == 0:
        warnings.append("No taxable sales found for this period.")

    return gstr3b_json, errors, warnings


# ── Flask download helpers ────────────────────────────────────────
def download_gstr1_json(df_gstr1, df_hsn, gstin, year, month):
    data, errors, warnings = generate_gstr1_json(df_gstr1, df_hsn, gstin, year, month)
    buf = io.BytesIO(json.dumps(data, indent=2).encode('utf-8'))
    buf.seek(0)
    filename = f"GSTR1_{gstin}_{ret_period(year,month)}.json"
    return send_file(buf, mimetype='application/json', as_attachment=True, download_name=filename), errors, warnings

def download_gstr3b_json(df_3b, gstin, year, month):
    data, errors, warnings = generate_gstr3b_json(df_3b, gstin, year, month)
    buf = io.BytesIO(json.dumps(data, indent=2).encode('utf-8'))
    buf.seek(0)
    filename = f"GSTR3B_{gstin}_{ret_period(year,month)}.json"
    return send_file(buf, mimetype='application/json', as_attachment=True, download_name=filename), errors, warnings
