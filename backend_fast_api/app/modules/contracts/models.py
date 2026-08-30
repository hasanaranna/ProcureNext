# ============================================================
# contracts/models.py - Contract & Review Data Types
# ============================================================

from enum import Enum

class ContractStatus(str, Enum):
    Draft = "Draft"
    Active = "Active"
    Completed = "Completed"
    Terminated = "Terminated"

class ReviewPartyRole(str, Enum):
    BuyerToSeller = "BuyerToSeller"
    SellerToBuyer = "SellerToBuyer"
