"""
GSTR-1 Official Excel Template Exporter.
Populates the government-issued GSTR-1 Excel offline utility template (GSTR1.xls)
with real business data from RetailWizard database.
"""
import openpyxl
import shutil
import tempfile
import os
import io
import re
import pyodbc
from datetime import datetime, date
from flask import send_file

from db_config import load_config
DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD = load_config()

# State mapping helper for official GST Place of Supply codes
def get_pos(state_name):
    if not state_name:
        return '06-Haryana'
    st = str(state_name).strip().lower()
    if 'haryana' in st:
        return '06-Haryana'
    elif 'delhi' in st:
        return '07-Delhi'
    elif 'punjab' in st:
        return '03-Punjab'
    elif 'up' in st or 'uttar' in st:
        return '09-Uttar Pradesh'
    elif 'rajasthan' in st:
        return '08-Rajasthan'
    elif 'hp' in st or 'himachal' in st:
        return '02-Himachal Pradesh'
    elif 'chandigarh' in st:
        return '04-Chandigarh'
    else:
        return '06-Haryana'  # Default to local state where the business is registered

# Clean HSN codes to keep only numeric parts
def clean_hsn(hsn):
    if not hsn:
        return ""
    # Strip everything after parenthesis and keep only digits
    hsn_clean = re.sub(r'[^0-9]', '', str(hsn).split('(')[0])
    return hsn_clean

# Clean UOM to standard UQC (Unit Quantity Code)
def get_uqc(uom):
    if not uom:
        return 'UNT-UNITS'
    u = str(uom).strip().upper()
    if 'UNT' in u or 'UNIT' in u:
        return 'UNT-UNITS'
    elif 'NOS' in u or 'NUM' in u:
        return 'NOS-NUMBERS'
    elif 'KGS' in u or 'KG' in u:
        return 'KGS-KILOGRAMS'
    elif 'PCS' in u or 'PIECE' in u:
        return 'PCS-PIECES'
    elif 'BOX' in u:
        return 'BOX-BOX'
    elif 'BTL' in u or 'BOTTLE' in u:
        return 'BTL-BOTTLES'
    elif 'CAN' in u:
        return 'CAN-CANS'
    elif 'GMS' in u or 'GRAM' in u:
        return 'GMS-GRAMMES'
    elif 'LTR' in u or 'LITRE' in u:
        return 'LTR-LITRES'
    elif 'PAC' in u or 'PACK' in u:
        return 'PAC-PACKS'
    else:
        return 'UNT-UNITS'

# Clean HSN description based on category desc
def clean_desc(desc):
    if not desc:
        return "FMCG GOODS"
    desc_str = str(desc).strip()
    if '!' in desc_str:
        parts = desc_str.split('!')
        part0 = parts[0].strip()
        if part0.upper() == 'NA':
            return parts[1].strip() if len(parts) > 1 else "FMCG GOODS"
        return part0
    return desc_str

# Clear data values starting from row 5 in sheets to avoid stale template data
def clear_template_data(wb):
    sheets_to_clear = [
        'b2b,sez,de', 'b2ba', 'b2cl', 'b2cla', 'b2cs', 'b2csa',
        'cdnr', 'cdnra', 'cdnur', 'cdnura', 'exp', 'expa',
        'at', 'ata', 'atadj', 'atadja', 'exemp', 'hsn(b2b)', 'hsn(b2c)',
        'docs', 'eco', 'ecoa', 'ecob2b', 'ecourp2b', 'ecob2c', 'ecourp2c',
        'ecoab2b', 'ecoab2c', 'ecoaurp2b', 'ecoaurp2c'
    ]
    for s_name in sheets_to_clear:
        if s_name in wb.sheetnames:
            ws = wb[s_name]
            # Cap at 100 rows to prevent iterating 1,048,576 rows due to global excel styling
            max_r = min(ws.max_row, 100)
            if max_r >= 5:
                # Setting value to None is extremely safe and preserves styling and validation borders
                for row in range(5, max_r + 1):
                    for col in range(1, ws.max_column + 1):
                        ws.cell(row=row, column=col).value = None

def generate_gstr1_template_excel(year, month, dept_code=''):
    server, name, user, password = load_config()
    conn_str = (f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
                f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;")
    
    conn = pyodbc.connect(conn_str, timeout=30)
    cursor = conn.cursor()
    
    # 1. Fetch B2CS Data (B2C Small) grouped by State and Rate
    b2cs_sql = """
        SELECT 
            ISNULL(CM.OFFICE1_STATE, '') AS CUSTOMER_STATE, 
            D.TAX_PERCENT AS GST_RATE, 
            SUM(D.AMOUNT) AS TAXABLE_VALUE,
            SUM(ISNULL(D.CESS_AMOUNT,0)) AS CESS_AMT
        FROM dbo.SALES_HDR H
        INNER JOIN dbo.SALES_DTL D ON H.BILL_NO=D.BILL_NO AND H.SH_DEPT_CODE=D.SD_DEPT_CODE
        LEFT JOIN dbo.CUSTOMER_MST CM ON H.CUSTOMER_CODE=CM.CUSTOMER_CODE
        WHERE DATEPART(YEAR, H.BILL_DATE)=? AND DATEPART(MONTH, H.BILL_DATE)=?
          AND ISNULL(H.ISCANCELLED,0)=0
          -- Unregistered: no GSTIN, and Invoice Value is < 2.5L (Small)
          AND (CM.GSTIN_NO IS NULL OR CM.GSTIN_NO = '')
          AND H.GRAND_TOTAL < 250000
          AND H.INVOICE_TPE NOT IN ('EXPORT','EXP')
          AND D.TAX_PERCENT > 0
          {dept}
        GROUP BY CM.OFFICE1_STATE, D.TAX_PERCENT
        ORDER BY CUSTOMER_STATE, D.TAX_PERCENT
    """.format(dept="AND H.SH_DEPT_CODE=?" if dept_code else "")
    
    b2cs_params = [year, month] + ([dept_code] if dept_code else [])
    cursor.execute(b2cs_sql, b2cs_params)
    b2cs_rows = cursor.fetchall()
    
    # 2. Fetch HSN B2C Data
    hsn_b2c_sql = """
        SELECT 
            ISNULL(I.HSN_CODE, D.HSNSACCODE) AS HSN_CODE,
            MAX(CAT.Category_Desc) AS CATEGORY_DESC,
            MAX(I.CONS_UOM) AS UOM,
            SUM(ISNULL(D.QTY,0)) AS TOTAL_QTY,
            D.TAX_PERCENT AS GST_RATE,
            SUM(ISNULL(D.AMOUNT,0)) AS TAXABLE_VALUE,
            SUM(CASE WHEN D.TAX_TYPE IN ('IGST','I') THEN D.TAX_AMOUNT ELSE 0 END) AS IGST_AMT,
            SUM(CASE WHEN D.TAX_TYPE NOT IN ('IGST','I') THEN D.TAX_AMOUNT/2 ELSE 0 END) AS CGST_AMT,
            SUM(CASE WHEN D.TAX_TYPE NOT IN ('IGST','I') THEN D.TAX_AMOUNT/2 ELSE 0 END) AS SGST_AMT,
            SUM(ISNULL(D.CESS_AMOUNT,0)) AS CESS_AMT
        FROM dbo.SALES_HDR H
        INNER JOIN dbo.SALES_DTL D ON H.BILL_NO=D.BILL_NO AND H.SH_DEPT_CODE=D.SD_DEPT_CODE
        LEFT  JOIN dbo.ITEM_MST I  ON D.SERVICEORPRODUCTCODE=I.ITEM_CODE
        LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE=CAT.Category_Code
        LEFT  JOIN dbo.CUSTOMER_MST CM ON H.CUSTOMER_CODE=CM.CUSTOMER_CODE
        WHERE DATEPART(YEAR, H.BILL_DATE)=? AND DATEPART(MONTH, H.BILL_DATE)=?
          AND ISNULL(H.ISCANCELLED,0)=0
          AND D.SALES_ITEM_TYPE='P'
          -- B2C: Unregistered customer
          AND (CM.GSTIN_NO IS NULL OR CM.GSTIN_NO = '')
          {dept}
        GROUP BY ISNULL(I.HSN_CODE, D.HSNSACCODE), D.TAX_PERCENT
        ORDER BY TAXABLE_VALUE DESC
    """.format(dept="AND H.SH_DEPT_CODE=?" if dept_code else "")
    
    cursor.execute(hsn_b2c_sql, b2cs_params)
    hsn_b2c_rows = cursor.fetchall()
    
    # 3. Fetch HSN B2B Data
    hsn_b2b_sql = """
        SELECT 
            ISNULL(I.HSN_CODE, D.HSNSACCODE) AS HSN_CODE,
            MAX(CAT.Category_Desc) AS CATEGORY_DESC,
            MAX(I.CONS_UOM) AS UOM,
            SUM(ISNULL(D.QTY,0)) AS TOTAL_QTY,
            D.TAX_PERCENT AS GST_RATE,
            SUM(ISNULL(D.AMOUNT,0)) AS TAXABLE_VALUE,
            SUM(CASE WHEN D.TAX_TYPE IN ('IGST','I') THEN D.TAX_AMOUNT ELSE 0 END) AS IGST_AMT,
            SUM(CASE WHEN D.TAX_TYPE NOT IN ('IGST','I') THEN D.TAX_AMOUNT/2 ELSE 0 END) AS CGST_AMT,
            SUM(CASE WHEN D.TAX_TYPE NOT IN ('IGST','I') THEN D.TAX_AMOUNT/2 ELSE 0 END) AS SGST_AMT,
            SUM(ISNULL(D.CESS_AMOUNT,0)) AS CESS_AMT
        FROM dbo.SALES_HDR H
        INNER JOIN dbo.SALES_DTL D ON H.BILL_NO=D.BILL_NO AND H.SH_DEPT_CODE=D.SD_DEPT_CODE
        LEFT  JOIN dbo.ITEM_MST I  ON D.SERVICEORPRODUCTCODE=I.ITEM_CODE
        LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE=CAT.Category_Code
        LEFT  JOIN dbo.CUSTOMER_MST CM ON H.CUSTOMER_CODE=CM.CUSTOMER_CODE
        WHERE DATEPART(YEAR, H.BILL_DATE)=? AND DATEPART(MONTH, H.BILL_DATE)=?
          AND ISNULL(H.ISCANCELLED,0)=0
          AND D.SALES_ITEM_TYPE='P'
          -- B2B: Registered customer
          AND CM.GSTIN_NO IS NOT NULL AND CM.GSTIN_NO <> ''
          {dept}
        GROUP BY ISNULL(I.HSN_CODE, D.HSNSACCODE), D.TAX_PERCENT
        ORDER BY TAXABLE_VALUE DESC
    """.format(dept="AND H.SH_DEPT_CODE=?" if dept_code else "")
    
    cursor.execute(hsn_b2b_sql, b2cs_params)
    hsn_b2b_rows = cursor.fetchall()

    # 4. Fetch B2B Invoices (B2B Sheet)
    b2b_sql = """
        SELECT 
            CM.GSTIN_NO AS CUSTOMER_GSTIN,
            H.CUSTOMER AS CUSTOMER_NAME,
            H.BILL_NO AS INVOICE_NO,
            H.BILL_DATE AS INVOICE_DATE,
            H.GRAND_TOTAL AS INVOICE_VALUE,
            ISNULL(CM.OFFICE1_STATE, '') AS CUSTOMER_STATE,
            D.TAX_PERCENT AS GST_RATE,
            SUM(D.AMOUNT) AS TAXABLE_VALUE,
            SUM(ISNULL(D.CESS_AMOUNT,0)) AS CESS_AMT
        FROM dbo.SALES_HDR H
        INNER JOIN dbo.SALES_DTL D ON H.BILL_NO=D.BILL_NO AND H.SH_DEPT_CODE=D.SD_DEPT_CODE
        LEFT JOIN dbo.CUSTOMER_MST CM ON H.CUSTOMER_CODE=CM.CUSTOMER_CODE
        WHERE DATEPART(YEAR, H.BILL_DATE)=? AND DATEPART(MONTH, H.BILL_DATE)=?
          AND ISNULL(H.ISCANCELLED,0)=0
          -- B2B: Registered
          AND CM.GSTIN_NO IS NOT NULL AND CM.GSTIN_NO <> ''
          AND H.INVOICE_TPE NOT IN ('EXPORT','EXP')
          AND D.TAX_PERCENT > 0
          {dept}
        GROUP BY CM.GSTIN_NO, H.CUSTOMER, H.BILL_NO, H.BILL_DATE, H.GRAND_TOTAL, CM.OFFICE1_STATE, D.TAX_PERCENT
        ORDER BY H.BILL_NO, D.TAX_PERCENT
    """.format(dept="AND H.SH_DEPT_CODE=?" if dept_code else "")
    
    cursor.execute(b2b_sql, b2cs_params)
    b2b_rows = cursor.fetchall()

    # 5. Fetch Document Summary Details
    docs_sql = """
        SELECT 
            MIN(BILL_NO) AS SR_FROM,
            MAX(BILL_NO) AS SR_TO,
            COUNT(BILL_NO) AS TOTAL_QTY,
            SUM(CASE WHEN ISNULL(ISCANCELLED,0)=1 THEN 1 ELSE 0 END) AS CANCELLED_QTY
        FROM dbo.SALES_HDR
        WHERE DATEPART(YEAR, BILL_DATE)=? AND DATEPART(MONTH, BILL_DATE)=?
          {dept}
    """.format(dept="AND SH_DEPT_CODE=?" if dept_code else "")
    
    cursor.execute(docs_sql, b2cs_params)
    docs_row = cursor.fetchone()
    
    conn.close()
    
    # ── Template File Copy and Load ──────────────────────────────
    template_path = r"c:\xampp\htdocs\fmcg_reports\GSTR1_OPTIMIZED.xlsx"
    
    # Self-healing fallback: recreate the optimized template if missing
    if not os.path.exists(template_path):
        try:
            from openpyxl.styles import Font as xlFont, PatternFill, Alignment as xlAlign, Border as xlBorder, Side as xlSide
            from openpyxl.utils import get_column_letter
            wb_new = openpyxl.Workbook()
            wb_new.remove(wb_new.active)
            
            font_title = xlFont(name='Calibri', size=14, bold=True, color='1F497D')
            font_header = xlFont(name='Calibri', size=11, bold=True, color='FFFFFF')
            font_totals_lbl = xlFont(name='Calibri', size=11, bold=True, color='000000')
            font_totals_val = xlFont(name='Calibri', size=11, bold=True, color='C00000')
            
            fill_totals = PatternFill(start_color='EAEAEA', end_color='EAEAEA', fill_type='solid')
            fill_header = PatternFill(start_color='1F497D', end_color='1F497D', fill_type='solid')
            
            thin_border_side = xlSide(border_style="thin", color="CCCCCC")
            thin_border = xlBorder(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
            
            sheets_config = {
                'b2b,sez,de': {
                    'title': 'Summary For B2B, SEZ, DE (4A, 4B, 6B, 6C)',
                    'labels': ['No. of Recipients', None, 'No. of Invoices', None, 'Total Invoice Value', None, None, None, None, None, None, 'Total Taxable Value', 'Total Cess'],
                    'formulas': ['=SUMPRODUCT((A5:A2000<>"")/COUNTIF(A5:A2000,A5:A2000&"")),', None, '=SUMPRODUCT((C5:C2000<>"")/COUNTIF(C5:C2000,C5:C2000&"")),', None, '=SUM(E5:E2000)', None, None, None, None, None, None, '=SUM(L5:L2000)', '=SUM(M5:M2000)'],
                    'headers': ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount']
                },
                'b2cs': {
                    'title': 'Summary For B2CS(7)',
                    'labels': [None, None, None, None, 'Total Taxable Value', 'Total Cess'],
                    'formulas': [None, None, None, None, '=SUM(E5:E2000)', '=SUM(F5:F2000)'],
                    'headers': ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN']
                },
                'hsn(b2c)': {
                    'title': 'Summary For HSN(12) - B2C Sales',
                    'labels': ['No. of HSN', None, None, None, 'Total Value', None, 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
                    'formulas': ['=SUMPRODUCT((A5:A2000<>"")/COUNTIF(A5:A2000,A5:A2000&"")),', None, None, None, '=SUM(E5:E2000)', None, '=SUM(G5:G2000)', '=SUM(H5:H2000)', '=SUM(I5:I2000)', '=SUM(J5:J2000)', '=SUM(K5:K2000)'],
                    'headers': ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']
                },
                'hsn(b2b)': {
                    'title': 'Summary For HSN(12) - B2B Sales',
                    'labels': ['No. of HSN', None, None, None, 'Total Value', None, 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess'],
                    'formulas': ['=SUMPRODUCT((A5:A2000<>"")/COUNTIF(A5:A2000,A5:A2000&"")),', None, None, None, '=SUM(E5:E2000)', None, '=SUM(G5:G2000)', '=SUM(H5:H2000)', '=SUM(I5:I2000)', '=SUM(J5:J2000)', '=SUM(K5:K2000)'],
                    'headers': ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']
                },
                'docs': {
                    'title': 'Summary of documents issued during the tax period (13)',
                    'labels': [None, None, None, 'Total Number', 'Total Cancelled'],
                    'formulas': [None, None, None, '=SUM(D5:D2000)', '=SUM(E5:E2000)'],
                    'headers': ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled']
                }
            }
            
            for s_name, config in sheets_config.items():
                ws = wb_new.create_sheet(title=s_name)
                ws.cell(row=1, column=1, value=config['title']).font = font_title
                ws.row_dimensions[1].height = 25
                ws.row_dimensions[2].height = 20
                for col_idx, val in enumerate(config['labels'], 1):
                    if val is not None:
                        cell = ws.cell(row=2, column=col_idx, value=val)
                        cell.font = font_totals_lbl
                        cell.fill = fill_totals
                        cell.alignment = xlAlign(horizontal='center', vertical='center')
                        cell.border = thin_border
                ws.row_dimensions[3].height = 20
                for col_idx, val in enumerate(config['formulas'], 1):
                    if val is not None:
                        cell = ws.cell(row=3, column=col_idx, value=val)
                        cell.font = font_totals_val
                        cell.fill = fill_totals
                        cell.alignment = xlAlign(horizontal='center', vertical='center')
                        cell.border = thin_border
                ws.row_dimensions[4].height = 26
                for col_idx, header in enumerate(config['headers'], 1):
                    cell = ws.cell(row=4, column=col_idx, value=header)
                    cell.font = font_header
                    cell.fill = fill_header
                    cell.alignment = xlAlign(horizontal='center', vertical='center')
                    cell.border = thin_border
                ws.views.sheetView[0].showGridLines = True
                for col in ws.columns:
                    col_letter = get_column_letter(col[0].column)
                    ws.column_dimensions[col_letter].width = 15
            wb_new.save(template_path)
            wb_new.close()
        except:
            pass

    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        tmp_path = tmp.name
        
    shutil.copyfile(template_path, tmp_path)
    
    # Load workbook using openpyxl on the copied .xlsx file
    wb = openpyxl.load_workbook(tmp_path)
    
    # 1. Clear sample values (skipped on clean optimized template, kept for safety)
    clear_template_data(wb)
    
    # ── Styling Helpers for Rows ───────────────────────────────
    from openpyxl.styles import Font as StyleFont, Alignment as StyleAlign, Border as StyleBorder, Side as StyleSide
    
    align_left = StyleAlign(horizontal='left', vertical='center')
    align_center = StyleAlign(horizontal='center', vertical='center')
    align_right = StyleAlign(horizontal='right', vertical='center')
    
    thin_s = StyleSide(border_style="thin", color="CCCCCC")
    std_border = StyleBorder(left=thin_s, right=thin_s, top=thin_s, bottom=thin_s)
    std_font = StyleFont(name='Calibri', size=11, bold=False)
    
    def style_row(ws, row_idx, max_col, alignments, formats=None):
        for col in range(1, max_col + 1):
            cell = ws.cell(row=row_idx, column=col)
            cell.font = std_font
            cell.border = std_border
            if alignments and col <= len(alignments):
                cell.alignment = alignments[col - 1]
            if formats and col <= len(formats) and formats[col - 1]:
                cell.number_format = formats[col - 1]
    
    # 2. Populate b2cs Sheet
    if 'b2cs' in wb.sheetnames:
        ws_b2cs = wb['b2cs']
        current_row = 5
        b2cs_align = [align_center, align_left, align_center, align_right, align_right, align_right, align_center]
        b2cs_formats = [None, None, None, '0.00', '0.00', '0.00', None]
        for row in b2cs_rows:
            ws_b2cs.cell(row=current_row, column=1, value='OE')  # Type
            ws_b2cs.cell(row=current_row, column=2, value=get_pos(row.CUSTOMER_STATE))  # Place of Supply
            ws_b2cs.cell(row=current_row, column=3, value=None)  # Applicable %
            ws_b2cs.cell(row=current_row, column=4, value=float(row.GST_RATE))  # Rate
            ws_b2cs.cell(row=current_row, column=5, value=float(row.TAXABLE_VALUE))  # Taxable Value
            ws_b2cs.cell(row=current_row, column=6, value=float(row.CESS_AMT))  # Cess
            ws_b2cs.cell(row=current_row, column=7, value=None)  # E-commerce GSTIN
            
            style_row(ws_b2cs, current_row, 7, b2cs_align, b2cs_formats)
            current_row += 1
            
    # 3. Populate hsn(b2c) Sheet
    if 'hsn(b2c)' in wb.sheetnames:
        ws_hsn = wb['hsn(b2c)']
        current_row = 5
        hsn_align = [align_center, align_left, align_center, align_right, align_right, align_right, align_right, align_right, align_right, align_right, align_right]
        hsn_formats = [None, None, None, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00']
        for row in hsn_b2c_rows:
            hsn_clean = clean_hsn(row.HSN_CODE)
            if not hsn_clean:
                continue
            taxable = float(row.TAXABLE_VALUE)
            igst = float(row.IGST_AMT)
            cgst = float(row.CGST_AMT)
            sgst = float(row.SGST_AMT)
            cess = float(row.CESS_AMT)
            total_value = taxable + igst + cgst + sgst + cess
            
            ws_hsn.cell(row=current_row, column=1, value=hsn_clean)  # HSN
            ws_hsn.cell(row=current_row, column=2, value=clean_desc(row.CATEGORY_DESC))  # Description
            ws_hsn.cell(row=current_row, column=3, value=get_uqc(row.UOM))  # UQC
            ws_hsn.cell(row=current_row, column=4, value=float(row.TOTAL_QTY))  # Total Quantity
            ws_hsn.cell(row=current_row, column=5, value=total_value)  # Total Value
            ws_hsn.cell(row=current_row, column=6, value=float(row.GST_RATE))  # Rate
            ws_hsn.cell(row=current_row, column=7, value=taxable)  # Taxable Value
            ws_hsn.cell(row=current_row, column=8, value=igst)  # Integrated Tax
            ws_hsn.cell(row=current_row, column=9, value=cgst)  # Central Tax
            ws_hsn.cell(row=current_row, column=10, value=sgst)  # State/UT Tax
            ws_hsn.cell(row=current_row, column=11, value=cess)  # Cess
            
            style_row(ws_hsn, current_row, 11, hsn_align, hsn_formats)
            current_row += 1

    # 4. Populate hsn(b2b) Sheet
    if 'hsn(b2b)' in wb.sheetnames:
        ws_hsn_b2b = wb['hsn(b2b)']
        current_row = 5
        for row in hsn_b2b_rows:
            hsn_clean = clean_hsn(row.HSN_CODE)
            if not hsn_clean:
                continue
            taxable = float(row.TAXABLE_VALUE)
            igst = float(row.IGST_AMT)
            cgst = float(row.CGST_AMT)
            sgst = float(row.SGST_AMT)
            cess = float(row.CESS_AMT)
            total_value = taxable + igst + cgst + sgst + cess
            
            ws_hsn_b2b.cell(row=current_row, column=1, value=hsn_clean)  # HSN
            ws_hsn_b2b.cell(row=current_row, column=2, value=clean_desc(row.CATEGORY_DESC))  # Description
            ws_hsn_b2b.cell(row=current_row, column=3, value=get_uqc(row.UOM))  # UQC
            ws_hsn_b2b.cell(row=current_row, column=4, value=float(row.TOTAL_QTY))  # Total Quantity
            ws_hsn_b2b.cell(row=current_row, column=5, value=total_value)  # Total Value
            ws_hsn_b2b.cell(row=current_row, column=6, value=float(row.GST_RATE))  # Rate
            ws_hsn_b2b.cell(row=current_row, column=7, value=taxable)  # Taxable Value
            ws_hsn_b2b.cell(row=current_row, column=8, value=igst)  # Integrated Tax
            ws_hsn_b2b.cell(row=current_row, column=9, value=cgst)  # Central Tax
            ws_hsn_b2b.cell(row=current_row, column=10, value=sgst)  # State/UT Tax
            ws_hsn_b2b.cell(row=current_row, column=11, value=cess)  # Cess
            
            style_row(ws_hsn_b2b, current_row, 11, hsn_align, hsn_formats)
            current_row += 1

    # 5. Populate b2b Sheet ('b2b,sez,de')
    if 'b2b,sez,de' in wb.sheetnames:
        ws_b2b = wb['b2b,sez,de']
        current_row = 5
        b2b_align = [align_center, align_left, align_center, align_center, align_right, align_left, align_center, align_center, align_center, align_center, align_right, align_right, align_right]
        b2b_formats = [None, None, None, None, '0.00', None, None, None, None, None, '0.00', '0.00', '0.00']
        for row in b2b_rows:
            inv_date = row.INVOICE_DATE
            date_str = inv_date.strftime('%d-%b-%Y') if isinstance(inv_date, (datetime, date)) else str(inv_date)
            
            ws_b2b.cell(row=current_row, column=1, value=str(row.CUSTOMER_GSTIN).upper().strip())  # GSTIN
            ws_b2b.cell(row=current_row, column=2, value=str(row.CUSTOMER_NAME).strip())  # Receiver Name
            ws_b2b.cell(row=current_row, column=3, value=str(row.INVOICE_NO))  # Invoice Number
            ws_b2b.cell(row=current_row, column=4, value=date_str)  # Invoice Date
            ws_b2b.cell(row=current_row, column=5, value=float(row.INVOICE_VALUE))  # Invoice Value
            ws_b2b.cell(row=current_row, column=6, value=get_pos(row.CUSTOMER_STATE))  # Place Of Supply
            ws_b2b.cell(row=current_row, column=7, value='N')  # Reverse Charge
            ws_b2b.cell(row=current_row, column=8, value=None)  # Applicable %
            ws_b2b.cell(row=current_row, column=9, value='Regular')  # Invoice Type
            ws_b2b.cell(row=current_row, column=10, value=None)  # E-commerce GSTIN
            ws_b2b.cell(row=current_row, column=11, value=float(row.GST_RATE))  # Rate
            ws_b2b.cell(row=current_row, column=12, value=float(row.TAXABLE_VALUE))  # Taxable Value
            ws_b2b.cell(row=current_row, column=13, value=float(row.CESS_AMT))  # Cess
            
            style_row(ws_b2b, current_row, 13, b2b_align, b2b_formats)
            current_row += 1

    # 6. Populate docs Sheet
    if 'docs' in wb.sheetnames and docs_row:
        ws_docs = wb['docs']
        current_row = 5
        tot_num = int(docs_row.TOTAL_QTY) if docs_row.TOTAL_QTY is not None else 0
        cancel_num = int(docs_row.CANCELLED_QTY) if docs_row.CANCELLED_QTY is not None else 0
        sr_from = str(docs_row.SR_FROM) if docs_row.SR_FROM is not None else ""
        sr_to = str(docs_row.SR_TO) if docs_row.SR_TO is not None else ""
        
        ws_docs.cell(row=current_row, column=1, value='Invoices for outward supply')  # Nature of Document
        ws_docs.cell(row=current_row, column=2, value=sr_from)  # From
        ws_docs.cell(row=current_row, column=3, value=sr_to)  # To
        ws_docs.cell(row=current_row, column=4, value=tot_num)  # Total Number
        ws_docs.cell(row=current_row, column=5, value=cancel_num)  # Cancelled
        
        docs_align = [align_left, align_center, align_center, align_right, align_right]
        docs_formats = [None, None, None, '#,##0', '#,##0']
        style_row(ws_docs, current_row, 5, docs_align, docs_formats)
        
    # Save workbook to memory buffer
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    
    # Close and remove temp file
    wb.close()
    try:
        os.remove(tmp_path)
    except:
        pass
        
    filename = f"GSTR1_Filing_Report_{year}_{int(month):02d}.xlsx"
    return send_file(buf,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=filename)
