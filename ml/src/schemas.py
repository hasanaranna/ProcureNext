from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ProcurementDocument(BaseModel):
    procurement_nature: str = "Goods"
    procurement_method: str = "Open Tendering Method"
    title: str = ""
    category: str = "Not applicable"
    eligibility_of_tenderer: str = ""
    description: str = ""
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    tender_public_date: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    pre_bid_meeting: Optional[datetime] = None
    tender_opening_date: Optional[datetime] = None
    embedding: Optional[List[float]] = None


class TextEmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class TextEmbedResponse(BaseModel):
    embedding: List[float]
