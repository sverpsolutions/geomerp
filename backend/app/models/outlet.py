from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import base

class outlet(base):
    __tablename__ = "outlets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    unit_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    outlet_name: Mapped[str] = mapped_column(String(255), nullable=False)
    server_name: Mapped[str | None] = mapped_column(String(200))
    database_name: Mapped[str | None] = mapped_column(String(100))
    db_username: Mapped[str | None] = mapped_column(String(100))
    db_password: Mapped[str | None] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(1), default="O") # H=Head Office, O=Outlet
    grp_code: Mapped[str | None] = mapped_column(String(20))
    
    # Basic Details
    outlet_code: Mapped[str | None] = mapped_column(String(20))
    short_name: Mapped[str | None] = mapped_column(String(50))
    company_name: Mapped[str | None] = mapped_column(String(100))
    
    # Address Details
    city: Mapped[str | None] = mapped_column(String(50))
    state: Mapped[str | None] = mapped_column(String(50))
    country: Mapped[str | None] = mapped_column(String(50), default="India")
    pincode: Mapped[str | None] = mapped_column(String(10))
    address: Mapped[str | None] = mapped_column(Text)
    landmark: Mapped[str | None] = mapped_column(String(100))
    
    # Contact Details
    manager_name: Mapped[str | None] = mapped_column(String(100))
    manager_mobile: Mapped[str | None] = mapped_column(String(15))
    manager_email: Mapped[str | None] = mapped_column(String(100))
    store_phone: Mapped[str | None] = mapped_column(String(15))
    whatsapp_number: Mapped[str | None] = mapped_column(String(15))
    emergency_contact: Mapped[str | None] = mapped_column(String(15))
    
    # Tax Details
    gst_number: Mapped[str | None] = mapped_column(String(15))
    pan_number: Mapped[str | None] = mapped_column(String(10))
    
    # Location Details
    latitude: Mapped[str | None] = mapped_column(String(20))
    longitude: Mapped[str | None] = mapped_column(String(20))
    map_link: Mapped[str | None] = mapped_column(Text)
    
    # Operation Details
    store_type: Mapped[str | None] = mapped_column(String(20)) # T1, T2, T3
    store_category: Mapped[str | None] = mapped_column(String(50))
    store_size: Mapped[str | None] = mapped_column(String(50))
    opening_date: Mapped[datetime | None] = mapped_column(DateTime)
    store_timing: Mapped[str | None] = mapped_column(String(100))
    is_delivery_available: Mapped[bool] = mapped_column(Boolean, default=False)
    is_online_order_available: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    
    # Price Update Settings
    price_update_level: Mapped[str | None] = mapped_column(String(50), default="All Store Level")
    
    # Document Paths
    store_image: Mapped[str | None] = mapped_column(String(255))
    front_image: Mapped[str | None] = mapped_column(String(255))
    gst_certificate: Mapped[str | None] = mapped_column(String(255))
    shop_license: Mapped[str | None] = mapped_column(String(255))
    other_docs: Mapped[str | None] = mapped_column(String(255))
    
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    sync_required: Mapped[bool] = mapped_column(Boolean, default=False)
    sales_sync_required: Mapped[bool] = mapped_column(Boolean, default=False)
    closing_sync_required: Mapped[bool] = mapped_column(Boolean, default=False)
    schemes_sync_required: Mapped[bool] = mapped_column(Boolean, default=False)
    
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
