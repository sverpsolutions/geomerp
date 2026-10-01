"""
Admin Blueprint — login, logout, company setup, user management.
"""
import os
from flask import (Blueprint, render_template, request, redirect,
                   url_for, flash, session, current_app)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from auth import is_superadmin

admin_bp = Blueprint('admin', __name__)

ALLOWED_IMG = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

# ── helpers ──────────────────────────────────────────────────────────────────

def _get_conn():
    """Re-use the app-level DB connection factory."""
    import pyodbc
    from app import DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASSWORD};TrustServerCertificate=yes;",
        timeout=30)


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMG


def _superadmin_required():
    if not is_superadmin():
        flash('SuperAdmin access required.', 'danger')
        return redirect(url_for('index'))
    return None


# ═════════════════════════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════════════════════════

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        try:
            conn   = _get_conn()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, password, role, is_active "
                "FROM dbo.app_users WHERE username=?", (username,))
            row = cursor.fetchone()
            conn.close()

            if row and row.is_active and check_password_hash(row.password, password):
                session.permanent = True
                session['user_id']  = row.id
                session['username'] = row.username
                session['role']     = row.role

                # Load allowed reports into session (not needed for superadmin but kept for speed)
                if row.role != 'superadmin':
                    conn2   = _get_conn()
                    cur2    = conn2.cursor()
                    cur2.execute("""
                        SELECT rm.report_key
                        FROM dbo.user_report_access ura
                        JOIN dbo.reports_master rm ON rm.id = ura.report_id
                        WHERE ura.user_id = ?
                    """, (row.id,))
                    session['allowed_reports'] = [r.report_key for r in cur2.fetchall()]
                    conn2.close()

                flash(f'Welcome, {row.username}!', 'success')
                return redirect(url_for('index'))
            else:
                flash('Invalid username or password.', 'danger')
        except Exception as e:
            flash(f'Login error: {e}', 'danger')

    return render_template('auth/login.html')


@admin_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('admin.login'))


# ═════════════════════════════════════════════════════════════════════════════
# COMPANY SETUP
# ═════════════════════════════════════════════════════════════════════════════

@admin_bp.route('/admin/company', methods=['GET', 'POST'])
def company_setup():
    guard = _superadmin_required()
    if guard:
        return guard

    conn   = _get_conn()
    cursor = conn.cursor()

    if request.method == 'POST':
        company_name = request.form.get('company_name', '').strip()
        address      = request.form.get('address', '').strip()
        mobile       = request.form.get('mobile', '').strip()
        email        = request.form.get('email', '').strip()
        gst          = request.form.get('gst', '').strip()
        footer       = request.form.get('footer', '').strip()

        # Handle logo upload
        logo_path = request.form.get('existing_logo', '')
        file = request.files.get('logo')
        if file and file.filename and _allowed_file(file.filename):
            filename   = secure_filename(file.filename)
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
            os.makedirs(upload_dir, exist_ok=True)
            save_path  = os.path.join(upload_dir, filename)
            file.save(save_path)
            logo_path  = f'uploads/{filename}'

        try:
            cursor.execute("SELECT id FROM dbo.company_master")
            existing = cursor.fetchone()
            if existing:
                cursor.execute("""
                    UPDATE dbo.company_master
                    SET company_name=?, logo_path=?, address=?, mobile=?,
                        email=?, gst=?, footer=?, updated_at=GETDATE()
                    WHERE id=?
                """, (company_name, logo_path or None, address, mobile,
                      email, gst, footer, existing.id))
            else:
                cursor.execute("""
                    INSERT INTO dbo.company_master
                        (company_name, logo_path, address, mobile, email, gst, footer)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (company_name, logo_path or None, address, mobile, email, gst, footer))
            conn.commit()
            flash('Company settings saved successfully.', 'success')
        except Exception as e:
            flash(f'Error saving: {e}', 'danger')
        finally:
            conn.close()
        return redirect(url_for('admin.company_setup'))

    # GET — load current data
    try:
        cursor.execute("SELECT * FROM dbo.company_master")
        row = cursor.fetchone()
        company = dict(zip([d[0] for d in cursor.description], row)) if row else {}
    except Exception as e:
        company = {}
        flash(f'Error loading company data: {e}', 'danger')
    finally:
        conn.close()

    return render_template('admin/company_setup.html', company=company)


# ═════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═════════════════════════════════════════════════════════════════════════════

@admin_bp.route('/admin/users')
def users_list():
    guard = _superadmin_required()
    if guard:
        return guard

    try:
        conn   = _get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.username, u.role, u.is_active, u.created_at,
                   COUNT(ura.report_id) AS report_count
            FROM dbo.app_users u
            LEFT JOIN dbo.user_report_access ura ON ura.user_id = u.id
            GROUP BY u.id, u.username, u.role, u.is_active, u.created_at
            ORDER BY u.created_at DESC
        """)
        cols  = [d[0] for d in cursor.description]
        users = [dict(zip(cols, r)) for r in cursor.fetchall()]
        conn.close()
    except Exception as e:
        users = []
        flash(f'Error loading users: {e}', 'danger')

    return render_template('admin/users.html', users=users)


@admin_bp.route('/admin/users/new', methods=['GET', 'POST'])
def user_new():
    guard = _superadmin_required()
    if guard:
        return guard
    return _user_form(user_id=None)


@admin_bp.route('/admin/users/<int:user_id>/edit', methods=['GET', 'POST'])
def user_edit(user_id):
    guard = _superadmin_required()
    if guard:
        return guard
    return _user_form(user_id=user_id)


@admin_bp.route('/admin/users/<int:user_id>/toggle', methods=['POST'])
def user_toggle(user_id):
    guard = _superadmin_required()
    if guard:
        return guard
    try:
        conn   = _get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.app_users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?",
            (user_id,))
        conn.commit()
        conn.close()
        flash('User status updated.', 'success')
    except Exception as e:
        flash(f'Error: {e}', 'danger')
    return redirect(url_for('admin.users_list'))


@admin_bp.route('/admin/users/<int:user_id>/delete', methods=['POST'])
def user_delete(user_id):
    guard = _superadmin_required()
    if guard:
        return guard
    try:
        conn   = _get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM dbo.app_users WHERE id=?", (user_id,))
        row = cursor.fetchone()
        if row and row.role == 'superadmin':
            flash('Cannot delete SuperAdmin.', 'danger')
        else:
            cursor.execute("DELETE FROM dbo.app_users WHERE id=?", (user_id,))
            conn.commit()
            flash('User deleted.', 'success')
        conn.close()
    except Exception as e:
        flash(f'Error: {e}', 'danger')
    return redirect(url_for('admin.users_list'))


# ── shared form handler ───────────────────────────────────────────────────────

def _user_form(user_id):
    conn   = _get_conn()
    cursor = conn.cursor()

    # Load all reports
    cursor.execute("SELECT id, report_name, report_key, category FROM dbo.reports_master ORDER BY category, report_name")
    cols    = [d[0] for d in cursor.description]
    reports = [dict(zip(cols, r)) for r in cursor.fetchall()]

    user            = {}
    assigned_report_ids = set()

    if user_id:
        cursor.execute("SELECT id, username, role, is_active FROM dbo.app_users WHERE id=?", (user_id,))
        row = cursor.fetchone()
        if row:
            user = dict(zip([d[0] for d in cursor.description], row))
        cursor.execute("SELECT report_id FROM dbo.user_report_access WHERE user_id=?", (user_id,))
        assigned_report_ids = {r.report_id for r in cursor.fetchall()}

    if request.method == 'POST':
        username       = request.form.get('username', '').strip()
        password       = request.form.get('password', '').strip()
        role           = request.form.get('role', 'user')
        is_active      = 1 if request.form.get('is_active') else 0
        selected_rids  = [int(x) for x in request.form.getlist('report_ids')]

        try:
            if user_id:
                # Edit mode
                if password:
                    cursor.execute(
                        "UPDATE dbo.app_users SET username=?, password=?, role=?, is_active=? WHERE id=?",
                        (username, generate_password_hash(password), role, is_active, user_id))
                else:
                    cursor.execute(
                        "UPDATE dbo.app_users SET username=?, role=?, is_active=? WHERE id=?",
                        (username, role, is_active, user_id))
                # Sync report access
                cursor.execute("DELETE FROM dbo.user_report_access WHERE user_id=?", (user_id,))
                for rid in selected_rids:
                    cursor.execute(
                        "INSERT INTO dbo.user_report_access (user_id, report_id) VALUES (?, ?)",
                        (user_id, rid))
                conn.commit()
                flash(f'User "{username}" updated.', 'success')
            else:
                # New user
                if not password:
                    flash('Password is required for new users.', 'danger')
                    conn.close()
                    return render_template('admin/user_form.html',
                                           user=user, reports=reports,
                                           assigned_report_ids=assigned_report_ids,
                                           is_edit=False)
                cursor.execute(
                    "INSERT INTO dbo.app_users (username, password, role, is_active) VALUES (?, ?, ?, ?)",
                    (username, generate_password_hash(password), role, is_active))
                conn.commit()
                cursor.execute("SELECT id FROM dbo.app_users WHERE username=?", (username,))
                new_id = cursor.fetchone().id
                for rid in selected_rids:
                    cursor.execute(
                        "INSERT INTO dbo.user_report_access (user_id, report_id) VALUES (?, ?)",
                        (new_id, rid))
                conn.commit()
                flash(f'User "{username}" created successfully.', 'success')

            conn.close()
            return redirect(url_for('admin.users_list'))
        except Exception as e:
            conn.close()
            flash(f'Error saving user: {e}', 'danger')

    conn.close()
    return render_template('admin/user_form.html',
                           user=user, reports=reports,
                           assigned_report_ids=assigned_report_ids,
                           is_edit=bool(user_id))
