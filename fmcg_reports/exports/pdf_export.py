"""
PDF Export — ReportLab. Company name/logo pulled from DB dynamically.
"""
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                 Paragraph, Spacer, HRFlowable, Image)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from flask import send_file
import io, os
from datetime import datetime

BRAND_COLOR  = colors.HexColor('#1a4e8f')
ACCENT_COLOR = colors.HexColor('#f4a621')
LIGHT_BLUE   = colors.HexColor('#dce8f8')
ALT_ROW      = colors.HexColor('#f7f9fc')


def _get_company():
    """Fetch company info from DB. Returns dict with defaults on error."""
    defaults = {'company_name': 'Business Reports', 'logo_path': None,
                'address': '', 'gst': '', 'footer': ''}
    try:
        import pyodbc
        from app import DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};"
            f"DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASSWORD};TrustServerCertificate=yes;",
            timeout=10)
        cursor = conn.cursor()
        cursor.execute("SELECT company_name, logo_path, address, gst, footer FROM dbo.company_master")
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                'company_name': row.company_name or defaults['company_name'],
                'logo_path':    row.logo_path,
                'address':      row.address or '',
                'gst':          row.gst or '',
                'footer':       row.footer or '',
            }
    except Exception:
        pass
    return defaults


def money(val):
    try:    return f"{float(val):,.2f}"
    except: return str(val) if val is not None else ''


def generate_pdf(df, title, report_key):
    company = _get_company()
    buf      = io.BytesIO()
    page_size = landscape(A4) if len(df.columns) > 8 else A4
    doc = SimpleDocTemplate(buf, pagesize=page_size,
                             leftMargin=1.5*cm, rightMargin=1.5*cm,
                             topMargin=1.8*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    # ── Company Header ─────────────────────────────────────
    co_style  = ParagraphStyle('Co', fontSize=16, fontName='Helvetica-Bold',
                                textColor=BRAND_COLOR, alignment=TA_CENTER, spaceAfter=2)
    addr_style= ParagraphStyle('Addr', fontSize=8, fontName='Helvetica',
                                textColor=colors.grey, alignment=TA_CENTER, spaceAfter=2)
    sub_style = ParagraphStyle('Sub', fontSize=10, fontName='Helvetica-Bold',
                                textColor=ACCENT_COLOR, alignment=TA_CENTER, spaceAfter=4)
    gen_style = ParagraphStyle('Gen', fontSize=8, fontName='Helvetica',
                                textColor=colors.grey, alignment=TA_CENTER, spaceAfter=6)

    # Logo
    if company['logo_path']:
        logo_abs = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                                'static', company['logo_path'])
        if os.path.exists(logo_abs):
            try:
                img = Image(logo_abs, width=3*cm, height=1.2*cm)
                img.hAlign = 'CENTER'
                story.append(img)
                story.append(Spacer(1, 0.2*cm))
            except Exception:
                pass

    story.append(Paragraph(company['company_name'], co_style))
    if company['address']:
        story.append(Paragraph(company['address'].replace('\n', ' | '), addr_style))
    if company['gst']:
        story.append(Paragraph(f"GSTIN: {company['gst']}", addr_style))
    story.append(Paragraph(title, sub_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%d/%m/%Y %I:%M %p')}", gen_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=BRAND_COLOR))
    story.append(Spacer(1, 0.3*cm))

    if df.empty:
        story.append(Paragraph('No records found for the selected criteria.', styles['Normal']))
    else:
        # Summary KPIs
        numeric_cols = df.select_dtypes(include='number').columns.tolist()
        if numeric_cols:
            kpi_data = [['Column', 'Total', 'Average', 'Max']]
            for col in numeric_cols[:5]:
                kpi_data.append([col, money(df[col].sum()),
                                  money(df[col].mean()), money(df[col].max())])
            kpi_tbl = Table(kpi_data, hAlign='LEFT')
            kpi_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), BRAND_COLOR),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',   (0,0), (-1,-1), 8),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, ALT_ROW]),
                ('GRID',       (0,0), (-1,-1), 0.3, colors.lightgrey),
            ]))
            story.append(Paragraph('Summary', ParagraphStyle('H3', fontSize=10,
                fontName='Helvetica-Bold', textColor=BRAND_COLOR)))
            story.append(Spacer(1, 0.2*cm))
            story.append(kpi_tbl)
            story.append(Spacer(1, 0.4*cm))

        # Main data table
        df_display = df.copy()
        for col in df_display.columns:
            if df_display[col].dtype in ['float64', 'float32']:
                df_display[col] = df_display[col].apply(money)
            else:
                df_display[col] = df_display[col].astype(str).replace('None', '').replace('nan', '')

        col_style  = ParagraphStyle('Col',  fontSize=7, fontName='Helvetica-Bold', textColor=colors.white)
        cell_style = ParagraphStyle('Cell', fontSize=7, fontName='Helvetica')
        header = [Paragraph(c.replace('_', ' '), col_style) for c in df_display.columns]
        rows   = [[Paragraph(str(v), cell_style) for v in row] for row in df_display.values]

        tbl = Table([header] + rows, repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0),  BRAND_COLOR),
            ('TEXTCOLOR',     (0,0), (-1,0),  colors.white),
            ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,-1), 7),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, ALT_ROW]),
            ('GRID',          (0,0), (-1,-1), 0.3, colors.lightgrey),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',    (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ]))
        story.append(Paragraph(f'Data ({len(df)} records)', ParagraphStyle('H3', fontSize=10,
            fontName='Helvetica-Bold', textColor=BRAND_COLOR)))
        story.append(Spacer(1, 0.2*cm))
        story.append(tbl)

    # Footer
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.lightgrey))
    footer_text = company['footer'] or f'Confidential — {company["company_name"]}'
    story.append(Paragraph(footer_text,
        ParagraphStyle('Footer', fontSize=7, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(story)
    buf.seek(0)
    filename = f"{report_key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return send_file(buf, mimetype='application/pdf',
                     as_attachment=True, download_name=filename)
