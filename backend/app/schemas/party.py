from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, field_validator, model_validator
import re
from app.utils.gst_validators import (
    validate_gstin, validate_pan, validate_cin,
    extract_pan_from_gstin, extract_state_code_from_gstin,
    CIN_REQUIRED_TYPES,
)


# ── Validators ────────────────────────────────────────────────────────────────

def _validate_gst(v: str | None) -> str | None:
    if v is None or v.strip() == "":
        return None
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    if not re.match(pattern, v.upper()):
        raise ValueError("invalid GST number format (e.g. 07ABCDE1234F1Z5)")
    return v.upper()


# ── Customer ──────────────────────────────────────────────────────────────────

class customer_create(BaseModel):
    name: str
    phone: str
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str = "Delhi"
    pincode: str | None = None
    type: str = "retail"
    gst_number: str | None = None
    credit_limit: Decimal = Decimal("0.00")
    opening_balance: Decimal = Decimal("0.00")
    show_outstanding_in_print: bool = False

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("retail", "wholesale", "hotel", "institution"):
            raise ValueError("type must be retail / wholesale / hotel / institution")
        return v

    @field_validator("gst_number")
    @classmethod
    def validate_gst(cls, v: str | None) -> str | None:
        return _validate_gst(v)


class customer_update(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    type: str | None = None
    gst_number: str | None = None
    credit_limit: Decimal | None = None
    status: bool | None = None
    show_outstanding_in_print: bool | None = None
    portal_active: bool | None = None


class customer_out(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None
    address: str | None
    city: str | None
    state: str
    pincode: str | None
    type: str
    gst_number: str | None
    credit_limit: Decimal
    balance: Decimal
    opening_balance: Decimal
    status: bool
    show_outstanding_in_print: bool
    portal_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class customer_list_out(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None
    city: str | None
    type: str
    gst_number: str | None
    balance: Decimal
    credit_limit: Decimal
    status: bool
    model_config = {"from_attributes": True}


# ── Supplier ──────────────────────────────────────────────────────────────────

# ── Supplier V2 ──────────────────────────────────────────────────────────────

class supplier_address_schema(BaseModel):
    id: int | None = None
    address_type: str = "Billing"
    address: str
    country: str = "India"
    state: str
    city: str
    pincode: str
    model_config = {"from_attributes": True}

class supplier_legal_schema(BaseModel):
    registration_type: str = "Regular"
    gst_no: str | None = None
    pan_no: str | None = None
    tan_no: str | None = None
    cin_no: str | None = None
    model_config = {"from_attributes": True}

class supplier_contact_schema(BaseModel):
    id: int | None = None
    name: str
    mobile: str
    email: str | None = None
    is_primary: bool = False
    model_config = {"from_attributes": True}

class supplier_director_schema(BaseModel):
    id: int | None = None
    director_name: str
    din: str | None = None
    email: str | None = None
    phone: str | None = None
    model_config = {"from_attributes": True}

class supplier_auth_person_schema(BaseModel):
    id: int | None = None
    name: str
    designation: str
    mobile: str
    email: str | None = None
    photo_path: str | None = None
    id_proof_path: str | None = None
    is_active: bool = True
    model_config = {"from_attributes": True}

class supplier_brand_schema(BaseModel):
    brand_id: int
    brand_name: str | None = None
    credit_days: int = 0
    model_config = {"from_attributes": True}

class supplier_brand_create(BaseModel):
    brand_id: int
    credit_days: int = 0

class supplier_financial_schema(BaseModel):
    bank_name: str | None = None
    account_no: str | None = None
    ifsc_code: str | None = None
    branch: str | None = None
    credit_limit: Decimal = Decimal("0.00")
    credit_days: int = 0
    model_config = {"from_attributes": True}

class supplier_document_schema(BaseModel):
    id: int | None = None
    document_type: str
    file_path: str
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    model_config = {"from_attributes": True}

class supplier_note_schema(BaseModel):
    id: int | None = None
    note: str
    note_type: str = "internal"
    created_by_name: str | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class approval_log_out(BaseModel):
    id: int
    action: str
    from_status: str | None = None
    to_status: str | None = None
    remarks: str | None = None
    performed_by_name: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


# Request body for approval actions (approve/reject/hold/request_correction)
class approval_action_body(BaseModel):
    remarks: str = ""
    correction_fields: list[str] = []   # used for request_correction action


class supplier_gstin_schema(BaseModel):
    """Single GSTIN registration record (multi-state support)."""
    id: int | None = None
    gstin: str
    state_code: str
    state_name: str | None = None
    pan: str
    registration_type: str = "Regular"
    is_primary: bool = False
    is_active: bool = True
    model_config = {"from_attributes": True}

    @field_validator("gstin")
    @classmethod
    def _val_gstin(cls, v: str) -> str:
        v = v.strip().upper()
        ok, err = validate_gstin(v)
        if not ok:
            raise ValueError(err)
        return v

    @field_validator("pan")
    @classmethod
    def _val_pan(cls, v: str) -> str:
        v = v.strip().upper()
        ok, err = validate_pan(v)
        if not ok:
            raise ValueError(err)
        return v


class supplier_create(BaseModel):
    name: str
    phone: str
    supplier_code: str | None = None
    supplier_type: str = "Manufacturer"
    company_type: str | None = None
    category: str | None = None
    contact_name: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str = "Delhi"
    state_code: str | None = None     # 2-digit GST state code
    pincode: str | None = None
    district: str | None = None
    country: str | None = None
    gst_number: str | None = None     # primary GSTIN (kept for backward compat)
    pan_number: str | None = None     # auto-populated from GSTIN
    cin_number: str | None = None     # CIN — mandatory for Pvt Ltd / Limited
    opening_balance: Decimal = Decimal("0.00")
    credit_limit_days: int = 0
    website: str | None = None
    notes: str | None = None
    registration_status: str = "approved"
    onboarding_token: str | None = None

    # Nested data
    addresses: list[supplier_address_schema] = []
    legal: supplier_legal_schema | None = None
    contacts: list[supplier_contact_schema] = []
    directors: list[supplier_director_schema] = []
    auth_persons: list[supplier_auth_person_schema] = []
    brands: list[supplier_brand_create] = []
    financial: supplier_financial_schema | None = None
    documents: list[supplier_document_schema] = []
    gstins: list[supplier_gstin_schema] = []   # multi-state GSTIN list

    @field_validator("gst_number")
    @classmethod
    def _val_gstin(cls, v: str | None) -> str | None:
        if not v or v.strip() == "":
            return None
        v = v.strip().upper()
        ok, err = validate_gstin(v)
        if not ok:
            raise ValueError(err)
        return v

    @field_validator("pan_number")
    @classmethod
    def _val_pan(cls, v: str | None) -> str | None:
        if not v or v.strip() == "":
            return None
        v = v.strip().upper()
        ok, err = validate_pan(v)
        if not ok:
            raise ValueError(err)
        return v

    @field_validator("cin_number")
    @classmethod
    def _val_cin(cls, v: str | None) -> str | None:
        if not v or v.strip() == "":
            return None
        v = v.strip().upper()
        ok, err = validate_cin(v, company_type=None)   # format only; cross-check in model_validator
        if not ok:
            raise ValueError(err)
        return v

    @model_validator(mode="after")
    def _cross_validate(self) -> "supplier_create":
        # 1. CIN mandatory for Pvt Ltd / Limited
        if self.company_type and self.company_type in CIN_REQUIRED_TYPES:
            if not self.cin_number:
                raise ValueError(
                    f"CIN Number is mandatory for {self.company_type} companies"
                )

        # 2. Auto-populate PAN from primary GSTIN if not explicitly supplied
        if self.gst_number and not self.pan_number:
            self.pan_number = extract_pan_from_gstin(self.gst_number)

        # 3. Auto-populate state_code from primary GSTIN if not set
        if self.gst_number and not self.state_code:
            self.state_code = extract_state_code_from_gstin(self.gst_number)

        # 4. GSTIN state code must match supplied state_code (if both present)
        if self.gst_number and self.state_code:
            gstin_sc = extract_state_code_from_gstin(self.gst_number)
            if gstin_sc != self.state_code:
                from app.utils.gst_validators import STATE_CODE_MAP
                gstin_sn = STATE_CODE_MAP.get(gstin_sc, gstin_sc)
                supp_sn = STATE_CODE_MAP.get(self.state_code, self.state_code)
                raise ValueError(
                    f"GSTIN State Code '{gstin_sc}' ({gstin_sn}) does not match "
                    f"selected state '{self.state_code}' ({supp_sn})"
                )

        return self


class supplier_update(BaseModel):
    name: str | None = None
    phone: str | None = None
    supplier_code: str | None = None
    supplier_type: str | None = None
    company_type: str | None = None
    category: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    credit_limit_days: int | None = None
    notes: str | None = None
    registration_status: str | None = None
    status: bool | None = None


class supplier_out(BaseModel):
    id: int
    supplier_code: str | None
    name: str
    supplier_type: str
    company_type: str | None
    category: str | None
    contact_name: str | None = None
    phone: str
    email: str | None
    address: str | None
    city: str | None
    state: str
    state_code: str | None = None
    pincode: str | None
    district: str | None
    country: str | None
    gst_number: str | None
    pan_number: str | None
    cin_number: str | None = None
    opening_balance: Decimal
    credit_limit_days: int
    website: str | None = None
    notes: str | None
    registration_status: str
    onboarding_token: str | None = None
    status: bool
    created_at: datetime
    # Approval tracking
    approved_by: int | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    correction_notes: str | None = None

    # Nested fields
    addresses: list[supplier_address_schema] = []
    legal: supplier_legal_schema | None = None
    contacts: list[supplier_contact_schema] = []
    directors: list[supplier_director_schema] = []
    auth_persons: list[supplier_auth_person_schema] = []
    brands: list[supplier_brand_schema] = []
    financial: supplier_financial_schema | None = None
    documents: list[supplier_document_schema] = []
    internal_notes: list[supplier_note_schema] = []
    gstins: list[supplier_gstin_schema] = []
    approval_logs: list[approval_log_out] = []

    model_config = {"from_attributes": True}


class supplier_list_out(BaseModel):
    id: int
    supplier_code: str | None
    name: str
    phone: str
    city: str | None
    gst_number: str | None
    supplier_type: str
    status: bool
    registration_status: str
    model_config = {"from_attributes": True}


# ── Supplier Terms ────────────────────────────────────────────────────────────

class supplier_terms_create(BaseModel):
    terms_text: str


class supplier_terms_out(BaseModel):
    id: int
    supplier_id: int
    terms_text: str | None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Ledger ────────────────────────────────────────────────────────────────────

class ledger_row(BaseModel):
    date: date
    ref_no: str
    type: str          # "invoice" | "payment" | "opening"
    description: str
    debit: Decimal
    credit: Decimal
    balance: Decimal
