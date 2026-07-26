import enum

class BidStatus(enum.Enum):
    Draft = "Draft"
    Submitted = "Submitted"
    UnderEvaluation = "UnderEvaluation"
    Accepted = "Accepted"
    Rejected = "Rejected"
    Withdrawn = "Withdrawn"
