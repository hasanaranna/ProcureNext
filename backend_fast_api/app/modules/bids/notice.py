# ============================================================
# bids/notice.py - Notice of Assessment (buyer -> winning seller)
#
# The notice is derived on demand from the bid, tender and award rows, so it
# needs no extra table. The same dict feeds the API response and the email.
# ============================================================

import asyncpg


def _fmt_date(value) -> str:
    return value.strftime("%d %B %Y") if value else ""


def _fmt_money(value) -> str:
    return f"Tk {float(value):,.2f}" if value is not None else "the amount stated in your proposal"


def build_notice_content(row: dict) -> dict:
    """Turn the joined award/bid/tender row into the notice's wording."""
    reference = f"NOA-{row['tender_id']:05d}-{row['bid_id']:05d}"
    amount = _fmt_money(row["financial_amount"])
    tender_title = row["tender_title"]
    buyer = row["buyer_org_name"]
    vendor = row["vendor_org_name"]

    paragraphs = [
        f"Following the evaluation of all proposals received for the tender \"{tender_title}\" "
        f"(Tender No. {row['tender_id']}), {buyer} is pleased to notify {vendor} that your proposal "
        f"has been assessed as the most responsive and advantageous submission, and is hereby accepted.",
        f"The accepted contract price is {amount}, as stated in your submitted proposal.",
    ]
    next_steps = [
        "Log in to ProcureNext and open the collaboration channel created for this tender to "
        "coordinate with the buyer.",
        "Confirm your acceptance of this notice by contacting the buyer through that channel.",
        "Prepare to execute the contract, including any documents the buyer requests at signing.",
    ]
    if row.get("security_required"):
        next_steps.append(
            "Furnish the performance security required under the tender conditions"
            + (f", valid until {_fmt_date(row['security_valid_until'])}" if row.get("security_valid_until") else "")
            + "."
        )
    closing = (
        "This Notice of Assessment does not replace the formal contract. It records the buyer's "
        "decision to award, and the contract will follow once both parties complete the steps above."
    )
    if row.get("proposal_valid_until"):
        closing += f" Your proposal remains valid until {_fmt_date(row['proposal_valid_until'])}."

    return {
        "reference": reference,
        "issued_on": _fmt_date(row["awarded_at"]),
        "tender_id": row["tender_id"],
        "bid_id": row["bid_id"],
        "tender_title": tender_title,
        "buyer_org_name": buyer,
        "buyer_address": row.get("buyer_address"),
        "vendor_org_name": vendor,
        "vendor_address": row.get("vendor_address"),
        "accepted_amount": amount,
        "subject": f"Notice of Assessment – {tender_title}",
        "paragraphs": paragraphs,
        "next_steps": next_steps,
        "closing": closing,
        "issued_by": row.get("issued_by_name"),
    }


async def fetch_notice(
    connection: asyncpg.Connection,
    bid_id: int,
    requester_org_id: int | None = None,
) -> dict | None:
    """
    Load the notice for an accepted bid. When requester_org_id is given, only the
    winning vendor's organisation or the tender's buyer organisation may read it.
    Returns None when the bid has no award, or the caller is not a party to it.
    """
    row = await connection.fetchrow(
        """
        SELECT b.bid_id, b.tender_id, b.financial_amount, b.vendor_org_id,
               t.title AS tender_title, t.buyer_id, t.security_required,
               t.security_valid_until, t.proposal_valid_until,
               buyer_org.organization_name  AS buyer_org_name,
               buyer_org.address            AS buyer_address,
               vendor_org.organization_name AS vendor_org_name,
               vendor_org.address           AS vendor_address,
               a.awarded_at,
               issuer.full_name             AS issued_by_name
        FROM bids b
        JOIN awards a ON a.winning_bid_id = b.bid_id
        JOIN tenders t ON t.tender_id = b.tender_id
        JOIN organizations buyer_org  ON buyer_org.organization_id  = t.buyer_id
        JOIN organizations vendor_org ON vendor_org.organization_id = b.vendor_org_id
        LEFT JOIN organization_employees oe ON oe.org_user_id = a.awarded_by
        LEFT JOIN users issuer ON issuer.user_id = oe.user_id
        WHERE b.bid_id = $1 AND b.status = 'Accepted'
        ORDER BY a.awarded_at DESC
        LIMIT 1
        """,
        bid_id,
    )
    if not row:
        return None
    row = dict(row)
    if requester_org_id is not None and requester_org_id not in (row["buyer_id"], row["vendor_org_id"]):
        return None
    return build_notice_content(row)
