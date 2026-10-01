from pydantic import BaseModel
from datetime import datetime

class OutletBase(BaseModel):
    unit_code: str
    outlet_name: str
    server_name: str | None = None
    database_name: str | None = None
    db_username: str | None = "postgres"
    db_password: str | None = None
    grp_code: str | None = None
    sync_required: bool = False
    sales_sync_required: bool = False
    closing_sync_required: bool = False
    schemes_sync_required: bool = False
    type: str = "O"
    is_active: bool = True
    
    # Basic Details
    outlet_code: str | None = None
    short_name: str | None = None
    company_name: str | None = None
    
    # Address Details
    city: str | None = None
    state: str | None = None
    country: str | None = "India"
    pincode: str | None = None
    address: str | None = None
    landmark: str | None = None
    
    # Contact Details
    manager_name: str | None = None
    manager_mobile: str | None = None
    manager_email: str | None = None
    store_phone: str | None = None
    whatsapp_number: str | None = None
    emergency_contact: str | None = None
    
    # Tax Details
    gst_number: str | None = None
    pan_number: str | None = None
    
    # Location Details
    latitude: str | None = None
    longitude: str | None = None
    map_link: str | None = None
    
    # Operation Details
    store_type: str | None = None
    store_category: str | None = None
    store_size: str | None = None
    opening_date: datetime | None = None
    store_timing: str | None = None
    is_delivery_available: bool = False
    is_online_order_available: bool = False
    notes: str | None = None
    
    # Price Update Settings
    price_update_level: str | None = "All Store Level"
    
    # Document Paths
    store_image: str | None = None
    front_image: str | None = None
    gst_certificate: str | None = None
    shop_license: str | None = None
    other_docs: str | None = None

class OutletCreate(OutletBase):
    pass

class OutletOut(OutletBase):
    id: int
    is_connected: bool
    last_connected_at: datetime | None = None

    class Config:
        from_attributes = True
