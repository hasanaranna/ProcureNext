from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class OrgInvitationCreateRequest(BaseModel):
    email: EmailStr
    organization_id: int
    invited_by: int


class OrgCreateRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=30)
    nid: int
    date_of_birth: date
    password: str = Field(min_length=8)

    organization_name: str = Field(min_length=1, max_length=255)
    organization_type: Literal["Buyer", "Vendor"] = "Buyer"
    address: str | None = None
    website: str | None = None
    description: str | None = None

    nid_front_url: str | None = None
    nid_back_url: str | None = None
    trade_license_url: str | None = None
    tin_certificate_url: str | None = None
    vat_certificate_url: str | None = None
    additional_document_urls: list[str] = Field(default_factory=list)


class UserSummary(BaseModel):
    user_id: int
    full_name: str | None
    email: EmailStr
    phone: str | None
    status: str


class OrganizationSummary(BaseModel):
    organization_id: int
    organization_name: str
    organization_type: str
    verification_status: str
    unique_join_code: str | None
    tin_number: str | None
    bin_number: str | None
    created_at: datetime | None


class OrgCreateResponse(BaseModel):
    message: str
    user: UserSummary
    organization: OrganizationSummary
