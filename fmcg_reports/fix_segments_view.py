import pyodbc, re

conn = pyodbc.connect(
    r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=26.80.248.161\sqlexpress;'
    r'DATABASE=RetailWizard;UID=sysuser;PWD=YOUR_DB_PASSWORD;TrustServerCertificate=yes;',
    timeout=30, autocommit=True)
cursor = conn.cursor()

with open('sql/02_gst_advanced_views.sql', 'r', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

match = re.search(
    r'(IF OBJECT_ID.*?VW_RPT_CUSTOMER_SEGMENTS.*?GO\s*CREATE VIEW dbo\.VW_RPT_CUSTOMER_SEGMENTS.*?)(?=GO\s*\n--|\Z)',
    sql, re.DOTALL|re.IGNORECASE)
section = match.group(1) if match else ''
batches = re.split(r'^\s*GO\s*$', section, flags=re.MULTILINE|re.IGNORECASE)

for b in batches:
    b = b.strip()
    if not b: continue
    lines = [l for l in b.splitlines() if l.strip() and not l.strip().startswith('--')]
    if not lines or lines[0].strip().upper().startswith('PRINT'): continue
    try:
        cursor.execute(b)
        print('OK:', b[:80].replace('\n',' '))
    except Exception as e:
        print('ERR:', str(e)[:150])

cursor.execute('SELECT TOP 0 * FROM dbo.VW_RPT_CUSTOMER_SEGMENTS')
print('Columns:', [c[0] for c in cursor.description])
conn.close()
print('Done.')
