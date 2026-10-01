from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Any

class audit_log_create(BaseModel):
    action: str
    module: str
    record_id: Optional[str] = None
    details: Optional[str] = None
    meta_data: Optional[dict] = None

class audit_log_out(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    action: str
    module: str
    record_id: Optional[str]
    details: Optional[str]
    meta_data: Optional[Any]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
