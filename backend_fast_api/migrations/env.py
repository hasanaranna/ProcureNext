# ============================================================
# migrations/env.py - Alembic Migration Environment
# ============================================================
# PURPOSE:
# Configures Alembic to work with our SQLAlchemy models and
# async PostgreSQL engine.
#
# RESPONSIBILITIES:
# - Import all model classes so Alembic can detect schema changes
# - Configure async database connection for migrations
# - Support --autogenerate flag for automatic migration creation
# - Handle pgvector VECTOR column type in migrations
#
# MODELS TO IMPORT (all modules):
# - users.models: Users, Roles, UserRoles, UserDocuments, Admins
# - organizations.models: Organizations, OrgUsers, OrgDocuments, OrgOwners
# - tenders.models: Tenders, TenderDocuments, TenderLots, TenderEvents,
#   Categories, ProcurementNature, ProcurementMethod, TenderClarifications,
#   TenderAmendments
# - invitations.models: TenderInvitations, NDARecords
# - bids.models: Bids, BidDocuments, BidSecurities
# - evaluations.models: Evaluations, Awards, AwardPublications
# - contracts.models: Contracts, ContractMilestones, WorkOrders
# - vendor_intelligence.models: VendorSkills, VendorSkillMap,
#   VendorPerformance, VendorMatchScores
# - payments.models: CreditAccounts, CreditTransactions, Payments,
#   PlatformPricing
# - notifications.models: Notifications
# - messaging.models: MessageThreads, ThreadParticipants, Messages,
#   MessageAttachments
# - disputes.models: Disputes, DisputeDocuments
# - audit.models: AuditLogs
# - reports.models: SystemMetrics
# - admin.models: UserReports
# ============================================================
