#!/usr/bin/env python3
"""
Create 20 Master Accounts on ProcureNext Demo Website
=====================================================
Sends multipart/form-data POST requests to http://13.212.216.26/api/org/orgs
to create 20 master (organization owner) accounts with dummy data.

Files used:
  - NID front & back: white-screen-image-1920x1080.png
  - Trade License, TIN Certificate, VAT Certificate: Blank PDF Document - blank.pdf
"""

import os
import sys
import time
import requests

# ─── Configuration ──────────────────────────────────────────────────────────

BASE_URL = "http://13.212.216.26"
API_ENDPOINT = f"{BASE_URL}/api/org/orgs"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FIXTURES_DIR = os.path.join(SCRIPT_DIR, "fixtures")
NID_IMAGE_PATH = os.path.join(FIXTURES_DIR, "white-screen-image-1920x1080.png")
BLANK_PDF_PATH = os.path.join(FIXTURES_DIR, "Blank PDF Document - blank.pdf")

# Common password for all demo accounts
COMMON_PASSWORD = "Demo@1234"

# ─── 20 Dummy Accounts ─────────────────────────────────────────────────────

ACCOUNTS = [
    {
        "name": "Rahim Uddin",
        "organizationName": "Rahim Enterprises Ltd.",
        "email": "rahim.uddin@demo.procurenext.com",
        "phone": "+8801711000001",
        "nid": "1990100000001",
        "date_of_birth": "1990-01-15",
    },
    {
        "name": "Fatima Akter",
        "organizationName": "Fatima Trading Co.",
        "email": "fatima.akter@demo.procurenext.com",
        "phone": "+8801711000002",
        "nid": "1992200000002",
        "date_of_birth": "1992-03-22",
    },
    {
        "name": "Kamal Hossain",
        "organizationName": "Hossain Construction Group",
        "email": "kamal.hossain@demo.procurenext.com",
        "phone": "+8801711000003",
        "nid": "1988300000003",
        "date_of_birth": "1988-07-10",
    },
    {
        "name": "Nasreen Begum",
        "organizationName": "Nasreen Textile Industries",
        "email": "nasreen.begum@demo.procurenext.com",
        "phone": "+8801711000004",
        "nid": "1985400000004",
        "date_of_birth": "1985-11-05",
    },
    {
        "name": "Tariq Rahman",
        "organizationName": "Rahman IT Solutions",
        "email": "tariq.rahman@demo.procurenext.com",
        "phone": "+8801711000005",
        "nid": "1991500000005",
        "date_of_birth": "1991-06-18",
    },
    {
        "name": "Sumaiya Khan",
        "organizationName": "Khan Pharmaceuticals Ltd.",
        "email": "sumaiya.khan@demo.procurenext.com",
        "phone": "+8801711000006",
        "nid": "1993600000006",
        "date_of_birth": "1993-09-30",
    },
    {
        "name": "Jahangir Alam",
        "organizationName": "Alam Steel Corporation",
        "email": "jahangir.alam@demo.procurenext.com",
        "phone": "+8801711000007",
        "nid": "1987700000007",
        "date_of_birth": "1987-04-12",
    },
    {
        "name": "Ayesha Siddiqua",
        "organizationName": "Siddiqua Fashion House",
        "email": "ayesha.siddiqua@demo.procurenext.com",
        "phone": "+8801711000008",
        "nid": "1994800000008",
        "date_of_birth": "1994-12-25",
    },
    {
        "name": "Moinul Islam",
        "organizationName": "Islam Logistics Services",
        "email": "moinul.islam@demo.procurenext.com",
        "phone": "+8801711000009",
        "nid": "1989900000009",
        "date_of_birth": "1989-02-14",
    },
    {
        "name": "Rubina Chowdhury",
        "organizationName": "Chowdhury Agro Industries",
        "email": "rubina.chowdhury@demo.procurenext.com",
        "phone": "+8801711000010",
        "nid": "1986000000010",
        "date_of_birth": "1986-08-20",
    },
    {
        "name": "Shariful Haque",
        "organizationName": "Haque Electronics Ltd.",
        "email": "shariful.haque@demo.procurenext.com",
        "phone": "+8801711000011",
        "nid": "1990100000011",
        "date_of_birth": "1990-05-03",
    },
    {
        "name": "Taslima Nahar",
        "organizationName": "Nahar Food & Beverages",
        "email": "taslima.nahar@demo.procurenext.com",
        "phone": "+8801711000012",
        "nid": "1992200000012",
        "date_of_birth": "1992-10-17",
    },
    {
        "name": "Rafiqul Anam",
        "organizationName": "Anam Power & Energy Co.",
        "email": "rafiqul.anam@demo.procurenext.com",
        "phone": "+8801711000013",
        "nid": "1984300000013",
        "date_of_birth": "1984-01-28",
    },
    {
        "name": "Sabrina Yeasmin",
        "organizationName": "Yeasmin Healthcare Solutions",
        "email": "sabrina.yeasmin@demo.procurenext.com",
        "phone": "+8801711000014",
        "nid": "1995400000014",
        "date_of_birth": "1995-07-09",
    },
    {
        "name": "Anisur Rahman",
        "organizationName": "Rahman Marine Services",
        "email": "anisur.rahman@demo.procurenext.com",
        "phone": "+8801711000015",
        "nid": "1988500000015",
        "date_of_birth": "1988-03-16",
    },
    {
        "name": "Nusrat Jahan",
        "organizationName": "Jahan Chemical Industries",
        "email": "nusrat.jahan@demo.procurenext.com",
        "phone": "+8801711000016",
        "nid": "1991600000016",
        "date_of_birth": "1991-11-22",
    },
    {
        "name": "Habibur Rashid",
        "organizationName": "Rashid Transport & Shipping",
        "email": "habibur.rashid@demo.procurenext.com",
        "phone": "+8801711000017",
        "nid": "1986700000017",
        "date_of_birth": "1986-06-04",
    },
    {
        "name": "Mahinur Akhter",
        "organizationName": "Akhter Digital Media",
        "email": "mahinur.akhter@demo.procurenext.com",
        "phone": "+8801711000018",
        "nid": "1993800000018",
        "date_of_birth": "1993-02-11",
    },
    {
        "name": "Delwar Hossain",
        "organizationName": "Hossain Real Estate Ltd.",
        "email": "delwar.hossain@demo.procurenext.com",
        "phone": "+8801711000019",
        "nid": "1985900000019",
        "date_of_birth": "1985-09-27",
    },
    {
        "name": "Farzana Islam",
        "organizationName": "Islam Green Energy Corp.",
        "email": "farzana.islam@demo.procurenext.com",
        "phone": "+8801711000020",
        "nid": "1990000000020",
        "date_of_birth": "1990-04-08",
    },
]


def verify_files():
    """Verify that all required files exist before starting."""
    if not os.path.exists(NID_IMAGE_PATH):
        print(f"❌ ERROR: NID image not found: {NID_IMAGE_PATH}")
        sys.exit(1)
    if not os.path.exists(BLANK_PDF_PATH):
        print(f"❌ ERROR: Blank PDF not found: {BLANK_PDF_PATH}")
        sys.exit(1)
    print(f"✅ NID image found: {os.path.basename(NID_IMAGE_PATH)} ({os.path.getsize(NID_IMAGE_PATH)} bytes)")
    print(f"✅ Blank PDF found: {os.path.basename(BLANK_PDF_PATH)} ({os.path.getsize(BLANK_PDF_PATH)} bytes)")


def create_account(index, account):
    """Create a single master account via the API."""
    # Open file handles for each upload
    nid_front = open(NID_IMAGE_PATH, "rb")
    nid_back = open(NID_IMAGE_PATH, "rb")
    trade_license = open(BLANK_PDF_PATH, "rb")
    tin_certificate = open(BLANK_PDF_PATH, "rb")
    vat_certificate = open(BLANK_PDF_PATH, "rb")

    # Build the multipart form — using 'data' for text fields and 'files' for uploads
    data = {
        "name": account["name"],
        "organizationName": account["organizationName"],
        "email": account["email"],
        "phone": account["phone"],
        "nid": account["nid"],
        "date_of_birth": account["date_of_birth"],
        "password": COMMON_PASSWORD,
    }

    files = {
        "nidFront": ("nid_front.png", nid_front, "image/png"),
        "nidBack": ("nid_back.png", nid_back, "image/png"),
        "tradeLicense": ("trade_license.pdf", trade_license, "application/pdf"),
        "tinCertificate": ("tin_certificate.pdf", tin_certificate, "application/pdf"),
        "vatCertificate": ("vat_certificate.pdf", vat_certificate, "application/pdf"),
    }

    try:
        response = requests.post(
            API_ENDPOINT,
            data=data,
            files=files,
            timeout=60,
        )
        try:
            body = response.json()
        except Exception:
            body = response.text
        return {
            "status_code": response.status_code,
            "response": body,
        }
    except requests.exceptions.RequestException as e:
        return {"status_code": 0, "response": str(e)}
    finally:
        nid_front.close()
        nid_back.close()
        trade_license.close()
        tin_certificate.close()
        vat_certificate.close()


def main():
    print("=" * 65)
    print("  ProcureNext — Create 20 Master Accounts (Demo Data)")
    print("=" * 65)
    print(f"  Target: {API_ENDPOINT}")
    print(f"  Password for all accounts: {COMMON_PASSWORD}")
    print()

    verify_files()
    print()

    success_count = 0
    fail_count = 0
    results = []

    for i, account in enumerate(ACCOUNTS, start=1):
        print(f"[{i:2d}/20] Creating: {account['name']} — {account['organizationName']}")
        print(f"         Email: {account['email']}")

        result = create_account(i, account)
        status = result["status_code"]

        if status == 201:
            print(f"         ✅ SUCCESS (HTTP {status})")
            success_count += 1
        elif status == 409:
            print(f"         ⚠️  ALREADY EXISTS (HTTP {status}): {result['response']}")
            success_count += 1  # Count as success since account exists
        else:
            print(f"         ❌ FAILED (HTTP {status}): {result['response']}")
            fail_count += 1

        results.append({"account": account, "result": result})
        print()

        # Small delay between requests to avoid overwhelming the server
        if i < len(ACCOUNTS):
            time.sleep(0.5)

    # ─── Summary ────────────────────────────────────────────────────────
    print("=" * 65)
    print("  SUMMARY")
    print("=" * 65)
    print(f"  Total accounts attempted: 20")
    print(f"  ✅ Successful:            {success_count}")
    print(f"  ❌ Failed:                {fail_count}")
    print()
    print("  All accounts use password: Demo@1234")
    print()

    if fail_count > 0:
        print("  Failed accounts:")
        for r in results:
            if r["result"]["status_code"] not in (201, 409):
                print(f"    - {r['account']['email']}: {r['result']['response']}")
        print()

    print("  Account Credentials:")
    print("  " + "-" * 61)
    print(f"  {'#':>3}  {'Email':<45} {'Password'}")
    print("  " + "-" * 61)
    for i, account in enumerate(ACCOUNTS, start=1):
        print(f"  {i:>3}  {account['email']:<45} {COMMON_PASSWORD}")
    print("  " + "-" * 61)
    print()
    print("  Login at: http://13.212.216.26/login")
    print("  Note: Accounts may require admin approval before login.")
    print("=" * 65)


if __name__ == "__main__":
    main()
