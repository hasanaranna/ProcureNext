from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrgInvitationCreateRequest(BaseModel):
    email: EmailStr


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


class OrgSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    organization_name: str
    organization_type: str
    address: str | None = None
    website: str | None = None
    description: str | None = None
    verification_status: str
    tin_number: str | None = None
    bin_number: str | None = None
    created_at: datetime | None = None
    is_enlisted: bool = False


class EnlistedOrgItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    organization_name: str
    organization_type: str
    address: str | None = None
    website: str | None = None
    description: str | None = None
    verification_status: str
    enlisted_at: datetime | None = None


class OrgDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: int
    document_type: str
    file_path: str
    file_url: str | None = None
    review_status: str
    uploaded_at: datetime | None = None


class OrgPublishedTenderItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tender_id: int
    title: str
    description: str
    budget_min: float | None = None
    budget_max: float | None = None
    submission_deadline: datetime | None = None
    status: str
    created_at: datetime | None = None


class OrgPerformanceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    average_rating: float | None = None
    total_reviews: int = 0
    recent_feedback: list[dict] = Field(default_factory=list)


class OrgProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    organization_name: str
    organization_type: str
    address: str | None = None
    website: str | None = None
    description: str | None = None
    verification_status: str
    tin_number: str | None = None
    bin_number: str | None = None
    created_at: datetime | None = None
    member_count: int = 0
    is_enlisted: bool = False
    documents: list[OrgDocumentItem] = Field(default_factory=list)
    published_tenders: list[OrgPublishedTenderItem] = Field(default_factory=list)
    performance: OrgPerformanceSummary | None = None
