from datetime import date, datetime

from pydantic import BaseModel, Field


class OrganizationMembership(BaseModel):
    organization_id: int
    organization_name: str
    organization_type: str
    role_in_org: str
    org_user_id: int


class UserProfileResponse(BaseModel):
    user_id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    nid: int
    date_of_birth: datetime
    status: str
    is_2fa_enabled: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    organizations: list[OrganizationMembership] = Field(default_factory=list)
    verification_status: str | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=1, max_length=30)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserDocumentResponse(BaseModel):
    review_status: str
    nid_front_url: str | None = None
    nid_back_url: str | None = None
    verified_at: datetime | None = None
