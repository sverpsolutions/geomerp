-- ============================================================
-- RetailWizard Reporting Suite
-- Auth + Company Setup Tables
-- Run this once in your SQL Server database (MBGUR03)
-- ============================================================

USE [RetailWizard];
GO

-- ──────────────────────────────────────────────────────────
-- 1. COMPANY MASTER
-- ──────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.company_master', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.company_master (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        company_name NVARCHAR(200)  NOT NULL DEFAULT 'My Company',
        logo_path    NVARCHAR(500)  NULL,
        address      NVARCHAR(1000) NULL,
        mobile       NVARCHAR(50)   NULL,
        email        NVARCHAR(200)  NULL,
        gst          NVARCHAR(50)   NULL,
        footer       NVARCHAR(500)  NULL,
        updated_at   DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Created: company_master';

    INSERT INTO dbo.company_master (company_name, footer)
    VALUES ('My Company', 'Thank you for your business.');
    PRINT 'Seeded: company_master default row';
END
ELSE
    PRINT 'Exists: company_master (skipped)';
GO

-- ──────────────────────────────────────────────────────────
-- 2. USERS
-- ──────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.app_users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.app_users (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        username   NVARCHAR(100) NOT NULL,
        password   NVARCHAR(512) NOT NULL,     -- Werkzeug PBKDF2 hash
        role       NVARCHAR(50)  NOT NULL DEFAULT 'user',
        is_active  BIT           NOT NULL DEFAULT 1,
        created_at DATETIME      DEFAULT GETDATE(),
        CONSTRAINT UQ_app_users_username UNIQUE (username)
    );
    PRINT 'Created: app_users';
    
    -- Seed SuperAdmin directly with password: <set-via-app>
    -- SuperAdmin is created by app.py init_db() from SUPERADMIN_PASSWORD
    PRINT 'Seeded: SuperAdmin user (password = <set-via-app>)';
END
ELSE
BEGIN
    -- Ensure SuperAdmin exists even if table existed
    IF NOT EXISTS (SELECT 1 FROM dbo.app_users WHERE username='SuperAdmin')
    BEGIN
    -- SuperAdmin is created by app.py init_db() from SUPERADMIN_PASSWORD
        PRINT 'Seeded missing: SuperAdmin user (password = <set-via-app>)';
    END
    PRINT 'Exists: app_users (skipped)';
END
GO

-- ──────────────────────────────────────────────────────────
-- 3. REPORTS MASTER
-- ──────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.reports_master', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.reports_master (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        report_name NVARCHAR(200) NOT NULL,
        report_key  NVARCHAR(100) NOT NULL,
        category    NVARCHAR(100) NULL,
        CONSTRAINT UQ_reports_master_key UNIQUE (report_key)
    );
    PRINT 'Created: reports_master';
END
ELSE
    PRINT 'Exists: reports_master (skipped)';
GO

-- Seed reports (safe: won't duplicate)
IF NOT EXISTS (SELECT 1 FROM dbo.reports_master WHERE report_key='sales_summary')
BEGIN
    INSERT INTO dbo.reports_master (report_name, report_key, category) VALUES
    ('Sales Summary',      'sales_summary',      'Sales'),
    ('Sales Detail',       'sales_detail',        'Sales'),
    ('Payment Collection', 'payment_collection',  'Sales'),
    ('Sales Returns',      'sales_returns',        'Sales'),
    ('Customer List',      'customer_list',        'Customer'),
    ('Customer Ledger',    'customer_ledger',      'Customer'),
    ('Loyalty Points',     'customer_loyalty',     'Customer'),
    ('Segments (RFM)',     'customer_segments',    'Customer'),
    ('Purchase Trend',     'customer_trend',       'Customer'),
    ('Smart Promotions',   'customer_promotions',  'Customer'),
    ('Purchase Summary',   'purchase_summary',     'Purchase'),
    ('Purchase Detail',    'purchase_detail',      'Purchase'),
    ('Purchase Returns',   'purchase_returns',     'Purchase'),
    ('Stock Status',       'inventory_stock',      'Inventory'),
    ('Stock Transfer',     'stock_transfer',       'Inventory'),
    ('Stock Valuation',    'stock_valuation',      'Inventory'),
    ('Live Dashboard',     'dashboard_live',       'Analytics'),
    ('Sales Trend',        'sales_trend',          'Analytics'),
    ('Top Items',          'top_items',            'Analytics'),
    ('Category Sales',     'category_sales',       'Analytics'),
    ('Supplier Report',    'supplier_report',      'Analytics'),
    ('Item Velocity',      'item_velocity',        'Analytics'),
    ('Profitability',      'profitability',        'Analytics'),
    ('Sales vs Purchase',  'sales_vs_purchase',    'Analytics'),
    ('Exceptions',         'exceptions',           'Analytics'),
    ('HSN Sales',          'gst_hsn_sales',        'GST'),
    ('HSN Purchase',       'gst_hsn_purchase',     'GST'),
    ('GSTR-1',             'gstr1',                'GST'),
    ('GSTR-3B',            'gstr3b',               'GST'),
    ('ITC Report',         'itc_report',           'GST'),
    ('Credit Notes',       'credit_notes',         'GST');
    PRINT 'Seeded: reports_master (31 reports)';
END
ELSE
    PRINT 'Exists: reports_master rows (skipped)';
GO

-- ──────────────────────────────────────────────────────────
-- 4. USER REPORT ACCESS
-- ──────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.user_report_access', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_report_access (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        user_id   INT NOT NULL REFERENCES dbo.app_users(id)    ON DELETE CASCADE,
        report_id INT NOT NULL REFERENCES dbo.reports_master(id) ON DELETE CASCADE,
        CONSTRAINT UQ_user_report UNIQUE (user_id, report_id)
    );
    PRINT 'Created: user_report_access';
END
ELSE
    PRINT 'Exists: user_report_access (skipped)';
GO

PRINT '=== Auth tables setup complete. Start the Flask app to seed SuperAdmin. ===';
GO
