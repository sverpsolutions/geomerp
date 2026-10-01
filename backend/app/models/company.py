from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric
from app.core.database import base

class CompanySetting(base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    key_name = Column(String, nullable=True)
    key_value = Column(Text, nullable=True)
    
    enable_markdown_calc = Column(Boolean, default=False)

    # Channel & Markdown Pricing Engine
    enable_channel_pricing  = Column(Boolean, default=False)
    markdown_admin_only     = Column(Boolean, default=True)
    minimum_global_margin   = Column(Numeric(5, 2), default=5.00)
    default_markdown_margin = Column(Numeric(5, 2), default=25.00)

    # Global Toggles
    enable_estimate_stock_check = Column(Boolean, default=True)
    block_estimate_if_no_stock = Column(Boolean, default=False)
    enable_bill_modify = Column(Boolean, default=True)
    enable_excel_import = Column(Boolean, default=True)
    enable_gst = Column(Boolean, default=True)
    default_cash_sale_mode = Column(Boolean, default=True)
    low_stock_threshold = Column(Integer, default=10)
    show_product_img = Column(Boolean, default=True)
    
    # Branding
    brand_name = Column(String, nullable=True)
    ho_address = Column(Text, nullable=True)
    ho_email = Column(String, nullable=True)
    ho_phone = Column(String, nullable=True)
    logo_path = Column(String, nullable=True)
    company_cin = Column(String, nullable=True)
    company_tan = Column(String, nullable=True)
    item_code_format = Column(String, default="[PREFIX]-[BRAND]-[VARIANT]-[SIZE]")
    hsn_code_length = Column(Integer, default=8)
    strict_hsn_validation = Column(Boolean, default=False)
