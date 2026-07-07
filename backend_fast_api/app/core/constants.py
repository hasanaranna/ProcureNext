# ============================================================
# constants.py - Application-Wide Enums & Constants
# ============================================================
# PURPOSE:
# Single source of truth for all enum values and constants
# used across the application. Matches the ERD exactly.
#
# ENUMS TO DEFINE:
#
# User & Access:
# - UserStatus: Active, Suspended, Pending
# - PlatformRole: Admin, Buyer, Vendor
# - AdminRole: SuperAdmin, PlatformAdmin
# - OrgRole: Owner, ProcurementOfficer, Finance, Viewer
#
# Organization:
# - OrganizationType: Buyer, Vendor (or both via dual registration)
# - VerificationStatus: Pending, Verified, Rejected
# - DocumentType: TradeLicense, TIN, VAT, RJSC, NID
# - DocumentReviewStatus: Pending, Approved, Rejected
#
# Tender:
# - TenderStatus: Draft, Published, Closed, Awarded, Cancelled
# - VisibilityType: Public, Restricted
# - BudgetType: Revenue, Capital, Internal
# - EvaluationType: Overall, LotWise
# - TenderEventType: PreBidMeeting, SiteVisit, ClarificationDeadline
#
# Procurement:
# - ProcurementNature: Goods, Works, Services, Consultancy
# - ProcurementMethod: OTM, RFQ, RFP, ReverseAuction, Direct
#
# Bid:
# - BidStatus: Draft, Submitted, UnderEvaluation, Accepted, Rejected, Withdrawn
# - BidSecurityType: BankGuarantee, Escrow, WalletHold
# - BidSecurityStatus: Pending, Valid, Expired
#
# Invitation & NDA:
# - InvitationStatus: Pending, Accepted, Declined
# - NDAStatus: Pending, Signed, Rejected
#
# Contract:
# - ContractStatus: Active, Completed, Terminated
#
# Payment:
# - TransactionType: Purchase, Deduct, Refund
# - PaymentStatus: Pending, Completed, Failed, Refunded
#
# Dispute:
# - DisputeStatus: Open, UnderReview, Resolved, Rejected
#
# Notification:
# - NotificationType: System, TenderUpdate, BidUpdate, Payment,
#                     Invitation, Award, Deadline, Message,
#                     Verification, Affiliation
#
# Audit:
# - AuditActionType: CREATE, UPDATE, DELETE, SUBMIT_BID,
#                    APPROVE_TENDER, AWARD, PAYMENT, VERIFY_DOC,
#                    LOGIN, PASSWORD_RESET
# ============================================================
