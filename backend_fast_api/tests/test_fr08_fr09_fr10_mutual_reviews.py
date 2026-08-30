# ============================================================================
# test_fr08_fr09_fr10_mutual_reviews.py
# Unit and integration test suite for ProcureNext:
# - FR-08: Tender Creation & Packaged Lots
# - FR-09: Vendor Matching & Recommendations
# - FR-10: Side-by-side Bid Comparison & Lots
# - Custom Extension (FR-14): Mutual Rating & Review System
# ============================================================================

import unittest
from datetime import datetime, timedelta

# ============================================================================
# A. FR-08: VALIDATING TENDER CREATION LOGIC (SINGLE VS PACKAGED)
# ============================================================================

def validate_tender_payload(payload: dict) -> bool:
    """
    Validates business rules for single-item vs packaged tender creation:
    - budget_max must be >= budget_min
    - submission_deadline must be in the future
    - SingleItem requires exactly 1 item
    - PackagedLots requires at least 2 items/lots
    """
    if payload.get("budget_max") is not None and payload.get("budget_min") is not None:
        if payload["budget_max"] < payload["budget_min"]:
            raise ValueError("budget_max cannot be less than budget_min.")

    deadline_str = payload.get("submission_deadline")
    if deadline_str:
        deadline = datetime.fromisoformat(deadline_str.replace("Z", ""))
        if deadline <= datetime.utcnow():
            raise ValueError("submission_deadline must be a future date.")

    package_type = payload.get("package_type", "SingleItem")
    items = payload.get("items")

    if items is not None:
        if package_type == "SingleItem":
            if len(items) != 1:
                raise ValueError("SingleItem tender must contain exactly one item/lot.")
        elif package_type == "PackagedLots":
            if len(items) < 2:
                raise ValueError("PackagedLots tender must contain at least two items/lots.")

    return True


class TestFR08TenderCreation(unittest.TestCase):
    def test_single_item_tender_valid(self):
        payload = {
            "title": "Hospital Medical Supplies",
            "package_type": "SingleItem",
            "budget_min": 10000.0,
            "budget_max": 25000.0,
            "submission_deadline": (datetime.utcnow() + timedelta(days=14)).isoformat() + "Z",
            "items": [
                {"lot_number": "LOT-1", "item_name": "Surgical Gloves", "quantity": 1000, "unit_of_measure": "Boxes"}
            ]
        }
        self.assertTrue(validate_tender_payload(payload))

    def test_packaged_lots_tender_valid(self):
        payload = {
            "title": "Combined Structural Materials Lot",
            "package_type": "PackagedLots",
            "budget_min": 500000.0,
            "budget_max": 900000.0,
            "submission_deadline": (datetime.utcnow() + timedelta(days=21)).isoformat() + "Z",
            "items": [
                {"lot_number": "LOT-1", "item_name": "Portland Cement", "quantity": 2000, "unit_of_measure": "Bags"},
                {"lot_number": "LOT-2", "item_name": "Deformed Steel Rod", "quantity": 25, "unit_of_measure": "Tons"}
            ]
        }
        self.assertTrue(validate_tender_payload(payload))

    def test_packaged_lots_rejects_single_item(self):
        payload = {
            "title": "Invalid Packaged Tender",
            "package_type": "PackagedLots",
            "submission_deadline": (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z",
            "items": [
                {"lot_number": "LOT-1", "item_name": "Portland Cement", "quantity": 2000, "unit_of_measure": "Bags"}
            ]
        }
        with self.assertRaises(ValueError) as ctx:
            validate_tender_payload(payload)
        self.assertIn("at least two items/lots", str(ctx.exception))

    def test_rejects_inverted_budget(self):
        payload = {
            "title": "Inverted Budget Tender",
            "budget_min": 50000.0,
            "budget_max": 20000.0,
            "submission_deadline": (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z",
        }
        with self.assertRaises(ValueError) as ctx:
            validate_tender_payload(payload)
        self.assertIn("cannot be less than budget_min", str(ctx.exception))


# ============================================================================
# B. FR-09: VENDOR MATCHING ALGORITHM SCORE CALCULATION
# ============================================================================

def calculate_vendor_match_score(vendor: dict, tender: dict) -> dict:
    """
    Computes weighted multi-factor recommendation score (0 to 100):
      - Category Match: 35%
      - Mutual Historical Rating: 30%
      - Enlistment Status: 20%
      - Certifications: 15%
    """
    is_exclusive = tender.get("visibility_type") == "Exclusive"
    is_enlisted = bool(vendor.get("is_enlisted", False))

    if is_exclusive and not is_enlisted:
        return {"score": 0.0, "reasons": ["Vendor is not enlisted for exclusive tender."]}

    cat_score = 1.0 if tender.get("category_id") in vendor.get("category_ids", []) else 0.15
    avg_rating = float(vendor.get("avg_seller_rating", 3.0))
    rating_score = min(max(avg_rating / 5.0, 0.0), 1.0)
    enlist_score = 1.0 if is_enlisted else 0.0

    certs = vendor.get("certifications", [])
    cert_score = 1.0 if len(certs) > 0 else 0.35

    composite_score = (
        (0.35 * cat_score) +
        (0.30 * rating_score) +
        (0.20 * enlist_score) +
        (0.15 * cert_score)
    ) * 100.0

    reasons = []
    if cat_score == 1.0:
        reasons.append("Exact category match")
    if avg_rating >= 4.5:
        reasons.append(f"High mutual satisfaction rating ({avg_rating:.1f}/5.0 stars)")
    if is_enlisted:
        reasons.append("Officially enlisted partner organization")
    if certs:
        reasons.append(f"Verified certifications: {', '.join(certs[:2])}")

    return {
        "score": round(composite_score, 1),
        "reasons": reasons
    }


class TestFR09VendorRecommendations(unittest.TestCase):
    def test_vendor_match_score_calculation(self):
        tender = {"category_id": 4, "visibility_type": "Public"}
        vendor = {
            "vendor_id": 101,
            "category_ids": [4, 7],
            "avg_seller_rating": 4.8, # 4.8/5 = 0.96 -> 0.30 * 0.96 = 0.288
            "is_enlisted": True,       # 0.20 * 1.0 = 0.20
            "certifications": ["ISO-9001"] # 0.15 * 1.0 = 0.15
        }
        # Expected: (0.35*1.0 + 0.288 + 0.20 + 0.15) * 100 = 98.8
        result = calculate_vendor_match_score(vendor, tender)
        self.assertEqual(result["score"], 98.8)
        self.assertIn("Exact category match", result["reasons"])
        self.assertIn("High mutual satisfaction rating (4.8/5.0 stars)", result["reasons"])
        self.assertIn("Officially enlisted partner organization", result["reasons"])

    def test_exclusive_tender_filters_unenlisted_vendor(self):
        tender = {"category_id": 4, "visibility_type": "Exclusive"}
        unenlisted_vendor = {
            "vendor_id": 102,
            "category_ids": [4],
            "avg_seller_rating": 5.0,
            "is_enlisted": False
        }
        result = calculate_vendor_match_score(unenlisted_vendor, tender)
        self.assertEqual(result["score"], 0.0)
        self.assertIn("not enlisted", result["reasons"][0])


# ============================================================================
# C. FR-10: SIDE-BY-SIDE BID COMPARISON & LOT EVALUATION
# ============================================================================

def format_side_by_side_comparison(tender: dict, raw_bids: list) -> dict:
    """
    Formats multi-bid side-by-side matrices, evaluates compliance,
    and tags the lowest conforming financial bid.
    """
    if not raw_bids:
        return {"tender_id": tender["tender_id"], "bids": [], "lowest_amount": None}

    lowest_amount = min(b["financial_amount"] for b in raw_bids)
    mandatory_doc_ids = {d["req_doc_id"] for d in tender.get("required_documents", []) if d.get("is_mandatory")}

    evaluated = []
    for bid in raw_bids:
        submitted_doc_ids = set(bid.get("submitted_doc_ids", []))
        is_compliant = mandatory_doc_ids.issubset(submitted_doc_ids)

        evaluated.append({
            "bid_id": bid["bid_id"],
            "vendor_name": bid["vendor_name"],
            "financial_amount": bid["financial_amount"],
            "is_lowest_bid": (bid["financial_amount"] == lowest_amount),
            "mandatory_docs_satisfied": is_compliant,
            "lot_pricing": bid.get("lot_pricing", [])
        })

    return {
        "tender_id": tender["tender_id"],
        "lowest_amount": lowest_amount,
        "bids": evaluated
    }


class TestFR10BidComparison(unittest.TestCase):
    def test_comparison_matrix_formatting_and_lowest_bid(self):
        tender = {
            "tender_id": 10,
            "required_documents": [
                {"req_doc_id": 1, "is_mandatory": True},
                {"req_doc_id": 2, "is_mandatory": True}
            ]
        }
        raw_bids = [
            {
                "bid_id": 201,
                "vendor_name": "Supplier A",
                "financial_amount": 75000.0,
                "submitted_doc_ids": [1, 2],
                "lot_pricing": [{"lot_number": "LOT-1", "unit_price": 75.0, "total_price": 75000.0}]
            },
            {
                "bid_id": 202,
                "vendor_name": "Supplier B",
                "financial_amount": 68000.0,
                "submitted_doc_ids": [1], # Missing doc 2
                "lot_pricing": [{"lot_number": "LOT-1", "unit_price": 68.0, "total_price": 68000.0}]
            }
        ]

        matrix = format_side_by_side_comparison(tender, raw_bids)
        self.assertEqual(matrix["lowest_amount"], 68000.0)

        bid_a = next(b for b in matrix["bids"] if b["bid_id"] == 201)
        bid_b = next(b for b in matrix["bids"] if b["bid_id"] == 202)

        # Supplier A is higher price but fully compliant
        self.assertFalse(bid_a["is_lowest_bid"])
        self.assertTrue(bid_a["mandatory_docs_satisfied"])

        # Supplier B is lowest price but flagged non-compliant for missing mandatory document
        self.assertTrue(bid_b["is_lowest_bid"])
        self.assertFalse(bid_b["mandatory_docs_satisfied"])


# ============================================================================
# D. MUTUAL RATING: CONTRACT COMPLETION & NO DOUBLE SUBMISSION
# ============================================================================

class MockContractReviewService:
    def __init__(self):
        self.contracts = {
            1: {"contract_id": 1, "status": "Active", "buyer_id": 10, "seller_id": 20},
            2: {"contract_id": 2, "status": "Completed", "buyer_id": 10, "seller_id": 20}
        }
        self.reviews = []

    def submit_review(self, contract_id: int, reviewer_org_id: int, rating: int, review_text: str):
        contract = self.contracts.get(contract_id)
        if not contract:
            raise KeyError("Contract not found.")

        # Rule 1: Contract status must be Completed
        if contract["status"] != "Completed":
            raise ValueError("Mutual reviews are only permitted after contract completion.")

        # Rule 2: Reviewer must be Buyer or Seller counterparty
        if reviewer_org_id not in (contract["buyer_id"], contract["seller_id"]):
            raise PermissionError("Your organization is not a party to this contract.")

        # Rule 3: No duplicate reviews by the same organization on the same contract
        already_reviewed = any(
            r["contract_id"] == contract_id and r["reviewer_org_id"] == reviewer_org_id 
            for r in self.reviews
        )
        if already_reviewed:
            raise ValueError("Duplicate review: your organization has already submitted a review for this contract.")

        # Rule 4: Star rating bounded 1 to 5
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5 stars.")

        self.reviews.append({
            "contract_id": contract_id,
            "reviewer_org_id": reviewer_org_id,
            "rating": rating,
            "review_text": review_text
        })
        return True


class TestMutualReviewSystem(unittest.TestCase):
    def test_review_rejected_for_active_contract(self):
        service = MockContractReviewService()
        with self.assertRaises(ValueError) as ctx:
            service.submit_review(contract_id=1, reviewer_org_id=10, rating=5, review_text="Great work")
        self.assertIn("only permitted after contract completion", str(ctx.exception))

    def test_both_parties_can_review_completed_contract(self):
        service = MockContractReviewService()
        # Buyer rates Seller
        res_buyer = service.submit_review(contract_id=2, reviewer_org_id=10, rating=5, review_text="Delivered on time")
        self.assertTrue(res_buyer)

        # Seller rates Buyer
        res_seller = service.submit_review(contract_id=2, reviewer_org_id=20, rating=5, review_text="Prompt milestone release")
        self.assertTrue(res_seller)
        self.assertEqual(len(service.reviews), 2)

    def test_prevents_duplicate_review_submission(self):
        service = MockContractReviewService()
        service.submit_review(contract_id=2, reviewer_org_id=10, rating=5, review_text="Initial review")

        # Second attempt by the same Buyer organization must fail
        with self.assertRaises(ValueError) as ctx:
            service.submit_review(contract_id=2, reviewer_org_id=10, rating=4, review_text="Attempted duplicate review")
        self.assertIn("Duplicate review", str(ctx.exception))

    def test_rejects_out_of_bounds_rating(self):
        service = MockContractReviewService()
        with self.assertRaises(ValueError) as ctx:
            service.submit_review(contract_id=2, reviewer_org_id=10, rating=6, review_text="Invalid 6 stars")
        self.assertIn("between 1 and 5 stars", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
