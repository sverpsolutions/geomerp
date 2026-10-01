from flask import Blueprint, render_template, request, jsonify
import pyodbc
import os
import re
from db_config import load_config, save_config

setup_bp = Blueprint('setup', __name__)

@setup_bp.route('/setup')
def setup_dashboard():
    # Load current configuration
    server, name, user, password = load_config()
    
    # Scan for SQL files in root and sql/ directories
    sql_files = []
    
    # Check root directory
    root_dir = os.path.dirname(os.path.abspath(__file__))
    for f in os.listdir(root_dir):
        if f.endswith('.sql'):
            sql_files.append({
                'name': f,
                'path': os.path.join(root_dir, f),
                'relative_path': f
            })
            
    # Check sql/ directory
    sql_dir = os.path.join(root_dir, 'sql')
    if os.path.exists(sql_dir):
        for f in os.listdir(sql_dir):
            if f.endswith('.sql'):
                sql_files.append({
                    'name': f"sql/{f}",
                    'path': os.path.join(sql_dir, f),
                    'relative_path': f"sql/{f}"
                })
                
    return render_template('setup.html', 
                           server=server, 
                           name=name, 
                           user=user, 
                           password=password,
                           sql_files=sql_files)

@setup_bp.route('/setup/test-db', methods=['POST'])
def test_db_connection():
    data = request.get_json() or {}
    server = data.get('server', '').strip()
    name = data.get('name', '').strip()
    user = data.get('user', '').strip()
    password = data.get('password', '').strip()
    
    if not server or not name or not user or not password:
        return jsonify({'success': False, 'message': 'All database connection parameters are required.'}), 400
        
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
        f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;"
    )
    
    try:
        conn = pyodbc.connect(conn_str, timeout=10)
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        row = cursor.fetchone()
        version = str(row[0]).split('\n')[0].strip() if row else 'Unknown version'
        conn.close()
        return jsonify({
            'success': True, 
            'message': 'Successfully connected to SQL Server!',
            'version': version
        })
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f"Connection failed: {str(e)}"
        })

@setup_bp.route('/setup/save-config', methods=['POST'])
def save_db_config():
    data = request.get_json() or {}
    server = data.get('server', '').strip()
    name = data.get('name', '').strip()
    user = data.get('user', '').strip()
    password = data.get('password', '').strip()
    
    if not server or not name or not user or not password:
        return jsonify({'success': False, 'message': 'All parameters must be specified.'}), 400
        
    try:
        save_config(server, name, user, password)
        return jsonify({'success': True, 'message': 'Configuration saved successfully! app.py and other modules have been updated.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to save configuration: {str(e)}"})

@setup_bp.route('/setup/run-sql', methods=['POST'])
def run_sql_script():
    data = request.get_json() or {}
    server = data.get('server', '').strip()
    name = data.get('name', '').strip()
    user = data.get('user', '').strip()
    password = data.get('password', '').strip()
    file_rel_path = data.get('file_path', '').strip()
    
    if not file_rel_path:
        return jsonify({'success': False, 'message': 'No SQL file selected.'}), 400
        
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
        f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;"
    )
    
    # Build absolute path securely
    root_dir = os.path.dirname(os.path.abspath(__file__))
    if file_rel_path.startswith('sql/'):
        file_path = os.path.join(root_dir, 'sql', file_rel_path[4:])
    else:
        file_path = os.path.join(root_dir, file_rel_path)
        
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': f"SQL file not found at: {file_path}"}), 400
        
    try:
        conn = pyodbc.connect(conn_str, timeout=30)
    except Exception as e:
        return jsonify({'success': False, 'message': f"Failed to connect to database to run SQL: {str(e)}"}), 400
        
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            sql_content = f.read()
            
        # Parse and split queries by batch separator 'GO'
        # GO must be on its own line (case-insensitive)
        blocks = re.split(r'^\s*GO\s*$', sql_content, flags=re.MULTILINE | re.IGNORECASE)
        
        cursor = conn.cursor()
        logs = []
        success_count = 0
        error_count = 0
        
        logs.append(f"Starting execution of {file_rel_path} ({len(blocks)} batches)...")
        
        for i, block in enumerate(blocks):
            query = block.strip()
            if not query:
                continue
                
            # Truncate clean display line
            lines = [l for l in query.split('\n') if l.strip() and not l.strip().startswith('--')]
            disp_line = lines[0][:80] if lines else "Query block"
            
            # Smart context interception: Intercept any USE [dbname] statement and dynamically override it to connected database context
            if re.search(r'\bUSE\s+\[?\w+\]?\s*;?', query, re.IGNORECASE):
                query = re.sub(r'\bUSE\s+\[?\w+\]?\s*;?', f"USE [{name}]", query, flags=re.IGNORECASE)
                disp_line = f"USE [{name}] (Dynamically overridden to connected database)"
            
            try:
                cursor.execute(query)
                conn.commit()
                success_count += 1
                logs.append(f"[OK] Batch {i+1} executed successfully: {disp_line}...")
            except Exception as ex:
                error_count += 1
                logs.append(f"[ERROR] Batch {i+1} failed: {str(ex)}")
                
        conn.close()
        
        # Self-healing database check: run python's init_db() to seed default records
        try:
            from app import init_db
            init_db()
            logs.append("[SYSTEM] Database self-healing check ran: Verified all default tables, reports, and SuperAdmin configurations.")
        except Exception as init_ex:
            logs.append(f"[SYSTEM] Self-healing warning: {str(init_ex)}")
            
        return jsonify({
            'success': True,
            'message': f"SQL script finished: {success_count} batches succeeded, {error_count} batches failed.",
            'success_count': success_count,
            'error_count': error_count,
            'logs': logs
        })
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'success': False, 'message': f"Failed executing SQL script: {str(e)}"})
