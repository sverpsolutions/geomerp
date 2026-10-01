from pydantic import BaseModel, field_validator


class user_create(BaseModel):
    name: str
    username: str
    password: str
    email: str | None = None
    role: str = "staff"
    role_id: int | None = None
    outlet_id: int | None = None
    
    # HHT / WMS Fields
    hht_login_id: str | None = None
    device_permission: bool = False
    warehouse_permission: bool = False
    putaway_rights: bool = False
    rack_transfer_rights: bool = False

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"admin", "manager", "staff", "accountant", "hr", "warehouse_staff", "hht_user", "supervisor"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v


class user_update(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    role_id: int | None = None
    outlet_id: int | None = None
    status: bool | None = None
    hht_login_id: str | None = None
    device_permission: bool | None = None
    warehouse_permission: bool | None = None
    putaway_rights: bool | None = None
    rack_transfer_rights: bool | None = None


class user_password_change(BaseModel):
    old_password: str
    new_password: str


class user_list_out(BaseModel):
    id: int
    name: str
    username: str
    email: str | None
    role: str
    outlet_id: int | None
    status: bool
    hht_login_id: str | None
    device_permission: bool
    warehouse_permission: bool
    putaway_rights: bool
    rack_transfer_rights: bool

    model_config = {"from_attributes": True}


class role_out(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class role_create(BaseModel):
    name: str
    slug: str
    description: str | None = None


class permission_out(BaseModel):
    id: int
    module: str
    name: str
    slug: str
    description: str | None

    model_config = {"from_attributes": True}


class permission_create(BaseModel):
    module: str
    name: str
    slug: str
    description: str | None = None


class assign_permissions(BaseModel):
    permission_ids: list[int]
