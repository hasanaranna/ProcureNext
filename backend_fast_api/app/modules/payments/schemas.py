# ============================================================
# payments/schemas.py - Payment & Credit Pydantic Schemas
# ============================================================

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class TokenBalanceResponse(BaseModel):
    organization_id: int
    organization_name: str
    credit_balance: int
    user_id: int
    role_in_org: Optional[str] = None


class PricingConfigResponse(BaseModel):
    pricing_id: int
    price_per_token: float
    tender_publish_cost: int
    bid_cost: int
    updated_at: Optional[datetime] = None


class UpdatePricingRequest(BaseModel):
    price_per_token: float = Field(..., gt=0, description="BDT cost for 1 token")
    tender_publish_cost: int = Field(..., ge=0, description="Tokens deducted when publishing a tender")
    bid_cost: int = Field(..., ge=0, description="Tokens deducted when placing a bid")


class TokenPurchaseRequest(BaseModel):
    tokens: int = Field(..., gt=0, description="Number of tokens to purchase")
    payment_method: str = Field(default="SSLCommerz", description="Payment gateway or method")
    card_type: Optional[str] = Field(default=None, description="e.g. VISA, Mastercard, bKash, Nagad")


class TokenPurchaseResponse(BaseModel):
    success: bool
    transaction_id: int
    tokens_added: int
    new_balance: int
    amount_paid_bdt: float
    payment_reference: str
    message: str


class TokenTransactionItem(BaseModel):
    transaction_id: int
    organization_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    amount: float
    transaction_type: str
    payment_reference: Optional[str] = None
    balance_after: float
    description: Optional[str] = None
    payment_method: Optional[str] = None
    created_at: datetime


class TransactionHistoryResponse(BaseModel):
    transactions: List[TokenTransactionItem]
    total_count: int
    current_balance: int


class TokenPackageResponse(BaseModel):
    package_id: int
    package_name: str
    token_amount: int
    price_bdt: float
    badge: Optional[str] = None
    is_active: bool = True
    original_price_bdt: float
    savings_percentage: int
    savings_bdt: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CreatePackageRequest(BaseModel):
    package_name: str = Field(..., min_length=1, max_length=100)
    token_amount: int = Field(..., gt=0, description="Token size / amount in the package")
    price_bdt: float = Field(..., gt=0, description="Total package price in BDT")
    badge: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)


class UpdatePackageRequest(BaseModel):
    package_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    token_amount: Optional[int] = Field(default=None, gt=0)
    price_bdt: Optional[float] = Field(default=None, gt=0)
    badge: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None
