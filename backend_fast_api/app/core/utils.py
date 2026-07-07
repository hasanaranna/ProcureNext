# ============================================================
# utils.py - General Utility Functions
# ============================================================
# PURPOSE:
# Shared helper functions used across multiple modules.
#
# UTILITIES TO IMPLEMENT:
# - generate_unique_code(): Generate unique organization codes
#   for the affiliation request system (FR-06)
# - hash_for_audit(data): Generate SHA-256 hash signature for
#   tamper-evident audit log entries (FR-22)
# - format_currency(amount, currency): Currency display formatting
# - sanitize_filename(name): Clean uploaded file names
# - generate_reference_number(prefix): Generate tender/bid reference
#   numbers (e.g., T-2026-00001, B-2026-00001)
# - validate_nid(nid): NID format validation
# - calculate_deadline_status(deadline): Check if a tender/bid
#   deadline has passed
# - build_email_context(template, **kwargs): Prepare email template data
# ============================================================
