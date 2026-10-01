from pydantic import BaseModel
from typing import Optional

class CompanySettingBase(BaseModel):
    brand_name: Optional[str] = None
    ho_address: Optional[str] = None
    ho_email: Optional[str] = None
    ho_phone: Optional[str] = None
    logo_path: Optional[str] = None
    company_cin: Optional[str] = None
    company_tan: Optional[str] = None
    item_code_format: Optional[str] = "[PREFIX]-[BRAND]-[VARIANT]-[SIZE]"
    
    enable_markdown_calc: bool = False
    # Channel & Markdown Pricing Engine
    enable_channel_pricing  : bool            = False
    markdown_admin_only     : bool            = True
    minimum_global_margin   : Optional[float] = 5.00
    default_markdown_margin : Optional[float] = 25.00
    enable_estimate_stock_check: bool = True
    block_estimate_if_no_stock: bool = False
    enable_bill_modify: bool = True
    enable_excel_import: bool = True
    enable_gst: bool = True
    default_cash_sale_mode: bool = True
    low_stock_threshold: int = 10
    show_product_img: bool = True
    hsn_code_length: int = 8
    strict_hsn_validation: bool = False

class CompanySettingUpdate(CompanySettingBase):
    pass

class CompanySettingOut(CompanySettingBase):
    id: int

    class Config:
        from_attributes = True
