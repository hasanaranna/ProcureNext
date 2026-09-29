import enum

class TenderVisibility(enum.Enum):
    Public = "Public"
    Restricted = "Restricted"
    Exclusive = "Exclusive"

class TenderStatus(enum.Enum):
    Draft = "Draft"
    Published = "Published"
    Closed = "Closed"
    Awarded = "Awarded"
    Cancelled = "Cancelled"
