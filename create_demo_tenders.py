#!/usr/bin/env python3
"""
Create Demo Tenders on ProcureNext Demo Website
===============================================
Logs in as each of the 20 master demo accounts
and publishes 5 professional tenders per account via
POST http://13.212.216.26/api/tenders/buyer/publish-with-documents

Each tender gets 2 attached documents, both using BlankPDFDocument-blank.pdf.

The script is re-runnable: tenders whose title already exists for an account
are skipped, and an account is skipped when it lacks tokens to publish.

Usage:
  python3 create_demo_tenders.py              # all 20 accounts
  python3 create_demo_tenders.py --limit 1    # only the first account
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

# ─── Configuration ──────────────────────────────────────────────────────────

BASE_URL = "http://13.212.216.26"
COMMON_PASSWORD = "Demo@1234"

# The 20 master accounts originally created by create_20_master_accounts.py
ACCOUNTS = [
    {"name": "Rahim Uddin", "organizationName": "Rahim Enterprises Ltd.", "email": "rahim.uddin@demo.procurenext.com"},
    {"name": "Fatima Akter", "organizationName": "Fatima Trading Co.", "email": "fatima.akter@demo.procurenext.com"},
    {"name": "Kamal Hossain", "organizationName": "Hossain Construction Group", "email": "kamal.hossain@demo.procurenext.com"},
    {"name": "Nasreen Begum", "organizationName": "Nasreen Textile Industries", "email": "nasreen.begum@demo.procurenext.com"},
    {"name": "Tariq Rahman", "organizationName": "Rahman IT Solutions", "email": "tariq.rahman@demo.procurenext.com"},
    {"name": "Sumaiya Khan", "organizationName": "Khan Pharmaceuticals Ltd.", "email": "sumaiya.khan@demo.procurenext.com"},
    {"name": "Jahangir Alam", "organizationName": "Alam Steel Corporation", "email": "jahangir.alam@demo.procurenext.com"},
    {"name": "Ayesha Siddiqua", "organizationName": "Siddiqua Fashion House", "email": "ayesha.siddiqua@demo.procurenext.com"},
    {"name": "Moinul Islam", "organizationName": "Islam Logistics Services", "email": "moinul.islam@demo.procurenext.com"},
    {"name": "Rubina Chowdhury", "organizationName": "Chowdhury Agro Industries", "email": "rubina.chowdhury@demo.procurenext.com"},
    {"name": "Shariful Haque", "organizationName": "Haque Electronics Ltd.", "email": "shariful.haque@demo.procurenext.com"},
    {"name": "Taslima Nahar", "organizationName": "Nahar Food & Beverages", "email": "taslima.nahar@demo.procurenext.com"},
    {"name": "Rafiqul Anam", "organizationName": "Anam Power & Energy Co.", "email": "rafiqul.anam@demo.procurenext.com"},
    {"name": "Sabrina Yeasmin", "organizationName": "Yeasmin Healthcare Solutions", "email": "sabrina.yeasmin@demo.procurenext.com"},
    {"name": "Anisur Rahman", "organizationName": "Rahman Marine Services", "email": "anisur.rahman@demo.procurenext.com"},
    {"name": "Nusrat Jahan", "organizationName": "Jahan Chemical Industries", "email": "nusrat.jahan@demo.procurenext.com"},
    {"name": "Habibur Rashid", "organizationName": "Rashid Transport & Shipping", "email": "habibur.rashid@demo.procurenext.com"},
    {"name": "Mahinur Akhter", "organizationName": "Akhter Digital Media", "email": "mahinur.akhter@demo.procurenext.com"},
    {"name": "Delwar Hossain", "organizationName": "Hossain Real Estate Ltd.", "email": "delwar.hossain@demo.procurenext.com"},
    {"name": "Farzana Islam", "organizationName": "Islam Green Energy Corp.", "email": "farzana.islam@demo.procurenext.com"},
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BLANK_PDF_PATH = os.path.join(SCRIPT_DIR, "BlankPDFDocument-blank.pdf")

LOGIN_URL = f"{BASE_URL}/api/auth/login"
BALANCE_URL = f"{BASE_URL}/api/payments/balance"
PRICING_URL = f"{BASE_URL}/api/payments/pricing"
MY_TENDERS_URL = f"{BASE_URL}/api/tenders/buyer/my-tenders"
PUBLISH_URL = f"{BASE_URL}/api/tenders/buyer/publish-with-documents"

TENDERS_PER_ACCOUNT = 5

REQUIRED_SELLER_DOCS = [
    {"name": "Valid Trade License", "allowed_roles": ["Owner"]},
    {"name": "TIN Certificate", "allowed_roles": ["Owner", "Finance"]},
    {"name": "VAT Registration Certificate (BIN)", "allowed_roles": ["Owner", "Finance"]},
    {"name": "Experience Certificates of Similar Contracts", "allowed_roles": ["Owner", "ProcurementOfficer"]},
]

# ─── Tender Specifications ──────────────────────────────────────────────────
# One list of 5 tenders per account, in the same order as ACCOUNTS.
# items: (item_name, specifications, quantity, unit_of_measure, estimated_unit_price)

T = lambda **kw: kw  # noqa: E731  (keeps the spec table compact)

TENDERS_BY_ACCOUNT = [
    # 1. Rahim Enterprises Ltd. — general trading
    [
        T(title="Supply of Office Furniture for Corporate Head Office, Gulshan",
          category="Office Furniture", nature="Goods", method="OTM", budget=4_800_000,
          location="Rahim Enterprises Head Office, Gulshan-2, Dhaka", days=45,
          scope="The requirement covers ergonomic workstations, executive desks, conference tables and high-back chairs for the newly renovated 6th and 7th floors.",
          items=[("Ergonomic Workstation with Pedestal", "1400x700mm, E1-grade MFC top, powder-coated steel frame, lockable 3-drawer pedestal", 120, "Sets", 32_000)]),
        T(title="Annual Rate Contract for Stationery and Office Consumables FY 2026-27",
          category="Stationery & Office Supplies", nature="Goods", method="RFQ", budget=1_600_000,
          location="Central Store, Tejgaon Industrial Area, Dhaka", days=365,
          scope="Monthly call-off supply of paper, toner, files and general stationery against an annual framework agreement.",
          items=[("A4 Copier Paper 80 GSM", "ISO 9706 compliant, 500 sheets/ream, brightness >= 95%", 4_000, "Reams", 400)]),
        T(title="Procurement of 3 Units Double-Cabin Pickup Vehicles",
          category="Vehicles", nature="Goods", method="OTM", budget=16_500_000,
          location="Rahim Enterprises Transport Pool, Uttara, Dhaka", days=90,
          scope="Brand-new 4x4 double-cabin pickups for field sales operations, including registration, comprehensive insurance and 3 years of free servicing.",
          items=[("4x4 Double-Cabin Pickup", "2.4L diesel, manual transmission, ABS, dual airbags, model year 2026", 3, "Units", 5_500_000)]),
        T(title="Security Guard Services for Warehouses and Head Office (2 Years)",
          category="Security Services", nature="Services", method="OTM", budget=7_200_000,
          location="Head Office (Gulshan) and 3 warehouses in Tongi and Narayanganj", days=730,
          scope="24x7 manned guarding with licensed, trained guards, supervisors, CCTV monitoring support and monthly incident reporting.",
          items=[("Armed / Unarmed Security Guard (Monthly)", "Licensed guards, 8-hour shifts, uniform and equipment by the service provider", 24, "Months", 300_000)]),
        T(title="Supply and Installation of Split Air Conditioners",
          category="HVAC Equipment", nature="Goods", method="RFQ", budget=3_150_000,
          location="Rahim Enterprises Regional Offices, Chattogram and Sylhet", days=40,
          scope="Supply, installation, testing and commissioning of inverter split AC units with copper piping, brackets and 3 years of comprehensive warranty.",
          items=[("2.0 Ton Inverter Split AC", "R32 refrigerant, 5-star energy rating, copper condenser, with 15 ft installation kit", 35, "Units", 90_000)]),
    ],
    # 2. Fatima Trading Co.
    [
        T(title="Import and Supply of Refined Sugar (500 MT)",
          category="Food Commodities", nature="Goods", method="OTM", budget=65_000_000,
          location="Fatima Trading Bonded Warehouse, Chattogram Port Area", days=60,
          scope="Supply of ICUMSA 45 refined white sugar packed in 50 kg PP bags, CFR Chattogram, with SGS pre-shipment inspection.",
          items=[("Refined White Sugar ICUMSA 45", "Moisture <= 0.04%, polarisation >= 99.8%, 50 kg PP bags with inner liner", 500, "MT", 130_000)]),
        T(title="Warehouse Racking System Supply and Installation",
          category="Warehouse Equipment", nature="Goods", method="OTM", budget=9_800_000,
          location="Fatima Trading Distribution Centre, Kanchpur, Narayanganj", days=75,
          scope="Design, supply and installation of selective pallet racking with 1,200 pallet positions, including load-rating signage and anchoring.",
          items=[("Selective Pallet Racking Bay", "Upright height 9m, 3 beam levels, 1,000 kg per level UDL, hot-rolled steel, epoxy coated", 400, "Bays", 24_500)]),
        T(title="Cargo Insurance Coverage for Import Consignments FY 2026-27",
          category="Insurance Services", nature="Services", method="RFP", budget=4_500_000,
          location="Fatima Trading Co., Agrabad C/A, Chattogram", days=365,
          scope="Open marine cargo insurance policy covering all import consignments (ICC-A clauses) with a declared annual turnover of approx. BDT 1,800 million.",
          items=[("Open Marine Cargo Policy", "Institute Cargo Clauses (A), war & SRCC extension, warehouse-to-warehouse", 1, "Lot", 4_500_000)]),
        T(title="Supply of Edible Soybean Oil in 5L PET Bottles",
          category="Food Commodities", nature="Goods", method="ReverseAuction", budget=28_000_000,
          location="Fatima Trading Distribution Centre, Kanchpur, Narayanganj", days=45,
          scope="Fortified refined soybean oil (Vitamin A enriched as per BSTI standard) in 5-litre food-grade PET bottles, 4 bottles per carton.",
          items=[("Fortified Soybean Oil 5L", "BSTI certified, Vitamin A 15-30 ppm, food-grade PET bottle, batch-coded", 32_000, "Bottles", 875)]),
        T(title="Implementation of Inventory Management Software (ERP Module)",
          category="Software & IT Services", nature="Services", method="RFP", budget=6_000_000,
          location="Fatima Trading Co., Agrabad C/A, Chattogram", days=180,
          scope="Implementation of a cloud-based inventory, procurement and warehouse management module integrated with the existing accounting system, including data migration and training.",
          items=[("ERP Inventory Module Implementation", "Multi-warehouse, barcode support, role-based access, 50 named users, 1 year support", 1, "Lot", 6_000_000)]),
    ],
    # 3. Hossain Construction Group
    [
        T(title="Supply of Ordinary Portland Cement for Purbachal Residential Project",
          category="Construction Materials", nature="Goods", method="OTM", budget=22_000_000,
          location="Purbachal New Town Sector-15 Project Site, Dhaka", days=120,
          scope="Staggered delivery of OPC cement for RCC works of a 12-storey residential complex, as per the delivery schedule in the attached BOQ.",
          items=[("Ordinary Portland Cement (CEM I 52.5N)", "BDS EN 197-1:2003, 50 kg bags, mill test certificate per lot", 40_000, "Bags", 550)]),
        T(title="Construction of Boundary Wall and Security Gate at Gazipur Plant",
          category="Civil Works", nature="Works", method="OTM", budget=14_500_000,
          location="Hossain Construction Group Pre-cast Plant, Kaliakair, Gazipur", days=150,
          scope="Construction of 1,850 m RCC boundary wall (2.4 m high) with barbed-wire fencing, two MS security gates and a guard house as per drawings.",
          items=[("RCC Boundary Wall", "2.4 m height, 250 mm brick wall with RCC columns @ 3 m c/c, plaster and weather coat", 1_850, "Running Metre", 7_800)]),
        T(title="Hiring of Tower Crane with Operator for 18 Months",
          category="Construction Equipment Hire", nature="Services", method="RFQ", budget=19_800_000,
          location="Bashundhara R/A Commercial Tower Project, Dhaka", days=540,
          scope="Hiring of a flat-top tower crane (min. 8-ton max load, 60 m jib) including erection, dismantling, certified operator, maintenance and third-party load test.",
          items=[("Tower Crane Hire (Monthly)", "Flat-top, 60 m jib, 8 t max load, 1.6 t at tip, operator and fuel included", 18, "Months", 1_100_000)]),
        T(title="Supply of Deformed Steel Bars (B500DWR) — 850 MT",
          category="Construction Materials", nature="Goods", method="ReverseAuction", budget=85_000_000,
          location="Purbachal and Bashundhara Project Sites, Dhaka", days=90,
          scope="Supply of high-strength deformed reinforcement bars in 10 mm to 25 mm diameters with mill test certificates and third-party BUET test reports.",
          items=[("Deformed Steel Bar B500DWR", "BDS ISO 6935-2:2021, yield strength >= 500 MPa, 12 m length", 850, "MT", 100_000)]),
        T(title="Structural Design Consultancy for 20-Storey Commercial Building",
          category="Engineering Consultancy", nature="Consultancy", method="RFP", budget=7_500_000,
          location="Hossain Construction Group, Banani, Dhaka", days=210,
          scope="Structural analysis, design and detailed drawings compliant with BNBC 2020, including soil-structure interaction, wind and seismic analysis and construction-stage supervision.",
          items=[("Structural Design & Supervision Services", "BNBC 2020 compliant, ETABS/SAFE models, 2 basement + 20 storeys", 1, "Lot", 7_500_000)]),
    ],
    # 4. Nasreen Textile Industries
    [
        T(title="Supply of 100% Cotton Combed Yarn (30s Ne)",
          category="Textile Raw Materials", nature="Goods", method="OTM", budget=36_000_000,
          location="Nasreen Textile Industries, Ashulia, Savar, Dhaka", days=60,
          scope="Supply of ring-spun combed cotton yarn for knit fabric production, with CSP, count variation and hairiness test reports per lot.",
          items=[("Combed Cotton Yarn 30/1 Ne", "Ring-spun, CSP >= 2,600, CV% count <= 1.5, 45.36 kg per bag", 120_000, "Kg", 300)]),
        T(title="Effluent Treatment Plant (ETP) Upgradation — 150 m³/hr",
          category="Environmental Works", nature="Works", method="OTM", budget=48_000_000,
          location="Nasreen Textile Industries Dyeing Unit, Ashulia, Savar", days=240,
          scope="Design, supply, civil works, installation and commissioning of a biological ETP upgrade to meet DoE discharge standards (ECR 2023) for the dyeing unit.",
          items=[("Biological ETP Upgrade", "150 m³/hr capacity, MBBR + tertiary treatment, online monitoring, 1 year O&M", 1, "Lot", 48_000_000)]),
        T(title="Procurement of High-Speed Circular Knitting Machines",
          category="Textile Machinery", nature="Goods", method="OTM", budget=75_000_000,
          location="Nasreen Textile Industries Knitting Unit, Ashulia, Savar", days=150,
          scope="Supply, installation and commissioning of single-jersey circular knitting machines with operator training and 2 years of spare parts support.",
          items=[("Single Jersey Circular Knitting Machine", "30 inch diameter, 24 gauge, 96 feeders, with lycra attachment", 10, "Units", 7_500_000)]),
        T(title="Reactive Dyes and Auxiliary Chemicals — Annual Supply",
          category="Dyes & Chemicals", nature="Goods", method="RFQ", budget=24_000_000,
          location="Nasreen Textile Industries Dyeing Unit, Ashulia, Savar", days=365,
          scope="Framework supply of ZDHC MRSL-compliant reactive dyes, levelling agents, sequestering agents and softeners with monthly call-off orders.",
          items=[("Reactive Dyes (Assorted Shades)", "ZDHC MRSL Level 3 compliant, with COA and MSDS per batch", 60_000, "Kg", 400)]),
        T(title="Rooftop Solar PV System (500 kWp) for Factory Building",
          category="Renewable Energy", nature="Works", method="OTM", budget=32_500_000,
          location="Nasreen Textile Industries, Ashulia, Savar, Dhaka", days=120,
          scope="EPC of a grid-tied rooftop solar PV system under the SREDA net-metering guideline, including structural assessment, monitoring system and 5 years of O&M.",
          items=[("500 kWp Grid-Tied Rooftop Solar PV", "Tier-1 mono PERC modules, string inverters, SCADA monitoring, net-metering", 1, "Lot", 32_500_000)]),
    ],
    # 5. Rahman IT Solutions
    [
        T(title="Supply of Enterprise Laptops for Development Team",
          category="IT Hardware", nature="Goods", method="RFQ", budget=9_600_000,
          location="Rahman IT Solutions, Mohakhali DOHS, Dhaka", days=30,
          scope="Business-class laptops with 3 years of onsite warranty, pre-loaded OS licences and asset tagging.",
          items=[("Business Laptop", "Intel Core Ultra 7 / 32 GB DDR5 / 1 TB NVMe / 14 inch FHD+ / Windows 11 Pro", 80, "Units", 120_000)]),
        T(title="Data Centre Colocation and Managed Hosting Services (3 Years)",
          category="Data Centre Services", nature="Services", method="RFP", budget=21_600_000,
          location="Tier-III certified data centre within Dhaka metropolitan area", days=1_095,
          scope="Colocation of 4 full racks with redundant power, cooling, 1 Gbps dedicated bandwidth, 24x7 NOC support and 99.98% uptime SLA.",
          items=[("Full Rack Colocation (Monthly)", "42U, 6 kVA per rack, A+B power feeds, remote hands, 1 Gbps", 36, "Months", 600_000)]),
        T(title="Next-Generation Firewall and Network Security Upgrade",
          category="Network & Security", nature="Goods", method="OTM", budget=12_000_000,
          location="Rahman IT Solutions, Mohakhali DOHS, Dhaka", days=60,
          scope="Supply, configuration and HA deployment of NGFW appliances with IPS, application control, SSL inspection and 3-year subscription licences.",
          items=[("Next-Generation Firewall Appliance", "10 Gbps threat-protection throughput, HA pair, 3-year UTP bundle", 2, "Units", 6_000_000)]),
        T(title="Microsoft 365 and Cloud Licence Renewal (Annual)",
          category="Software Licences", nature="Goods", method="Direct", budget=5_400_000,
          location="Rahman IT Solutions, Mohakhali DOHS, Dhaka", days=15,
          scope="Annual renewal of Microsoft 365 Business Premium licences through an authorised Cloud Solution Provider, including tenant migration support.",
          items=[("Microsoft 365 Business Premium (Annual)", "Per-user annual subscription via authorised CSP", 300, "Licences", 18_000)]),
        T(title="Third-Party Penetration Testing and ISO 27001 Readiness Audit",
          category="Cyber Security Consultancy", nature="Consultancy", method="RFP", budget=3_800_000,
          location="Rahman IT Solutions, Mohakhali DOHS, Dhaka", days=90,
          scope="External and internal VAPT of web applications, APIs and infrastructure, plus an ISO/IEC 27001:2022 gap assessment and remediation roadmap.",
          items=[("VAPT & ISO 27001 Gap Assessment", "OWASP-based testing, CREST/OSCP-certified testers, executive and technical reports", 1, "Lot", 3_800_000)]),
    ],
    # 6. Khan Pharmaceuticals Ltd.
    [
        T(title="Supply of Active Pharmaceutical Ingredient — Paracetamol BP",
          category="Pharmaceutical Raw Materials", nature="Goods", method="OTM", budget=18_000_000,
          location="Khan Pharmaceuticals Manufacturing Plant, Tongi, Gazipur", days=75,
          scope="Supply of Paracetamol API from a WHO-GMP certified manufacturer with DMF, COA and stability data for each batch.",
          items=[("Paracetamol BP (API)", "BP/USP current edition, particle size D90 <= 250 µm, 25 kg fibre drums", 30_000, "Kg", 600)]),
        T(title="Procurement of HPLC Systems for Quality Control Laboratory",
          category="Laboratory Equipment", nature="Goods", method="OTM", budget=16_000_000,
          location="Khan Pharmaceuticals QC Laboratory, Tongi, Gazipur", days=90,
          scope="Supply, installation, IQ/OQ/PQ qualification and 21 CFR Part 11 compliant software for HPLC systems, with analyst training.",
          items=[("HPLC System with PDA Detector", "Quaternary pump, autosampler (120 vials), column oven, PDA detector, CDS software", 4, "Units", 4_000_000)]),
        T(title="Cleanroom HVAC Validation and Annual Maintenance Contract",
          category="Validation Services", nature="Services", method="RFQ", budget=4_200_000,
          location="Khan Pharmaceuticals Manufacturing Plant, Tongi, Gazipur", days=365,
          scope="Annual HVAC qualification (air-flow, HEPA integrity, particle count, recovery tests) for ISO Class 7/8 cleanrooms and preventive maintenance of AHUs.",
          items=[("Cleanroom HVAC Validation & AMC", "EU-GMP Annex 1 aligned, 14 AHUs, quarterly PM, calibrated instruments", 1, "Lot", 4_200_000)]),
        T(title="Supply of Pharmaceutical-Grade Alu-Alu Blister Foil",
          category="Pharmaceutical Packaging", nature="Goods", method="ReverseAuction", budget=11_000_000,
          location="Khan Pharmaceuticals Packaging Store, Tongi, Gazipur", days=60,
          scope="Cold-form Alu-Alu blister laminate and lidding foil compatible with existing blister packing lines, with DMF and food-contact compliance.",
          items=[("Cold-Form Alu-Alu Laminate", "OPA 25 µm / Alu 45 µm / PVC 60 µm, 170 mm width", 22_000, "Kg", 500)]),
        T(title="Cold Chain Distribution Services for Vaccines and Biologics",
          category="Cold Chain Logistics", nature="Services", method="RFP", budget=8_400_000,
          location="Nationwide distribution from Tongi Central Warehouse", days=365,
          scope="Temperature-controlled (2–8 °C) distribution to 64 district depots with real-time data loggers, GDP-compliant vehicles and deviation reporting.",
          items=[("Refrigerated Distribution Service (Monthly)", "2–8 °C validated reefer vans, GPS and temperature telemetry, GDP compliance", 12, "Months", 700_000)]),
    ],
    # 7. Alam Steel Corporation
    [
        T(title="Supply of Heavy Melting Scrap (HMS 1&2 80:20) — 5,000 MT",
          category="Steel Raw Materials", nature="Goods", method="OTM", budget=290_000_000,
          location="Alam Steel Corporation Melt Shop, Sitakunda, Chattogram", days=90,
          scope="Supply of ISRI-grade heavy melting scrap CFR Chattogram with pre-shipment radiation and quality inspection certificates.",
          items=[("HMS 1&2 (80:20)", "ISRI 200-206, free from radioactive and hazardous material, PSIC required", 5_000, "MT", 58_000)]),
        T(title="Graphite Electrodes for Electric Arc Furnace",
          category="Steel Consumables", nature="Goods", method="RFQ", budget=42_000_000,
          location="Alam Steel Corporation Melt Shop, Sitakunda, Chattogram", days=60,
          scope="Ultra-high-power graphite electrodes with pre-set nipples for a 50-ton EAF, including technical support for consumption optimisation.",
          items=[("UHP Graphite Electrode 500 mm", "UHP grade, 500 mm dia x 2,400 mm, with 4TPI nipple", 120, "MT", 350_000)]),
        T(title="Overhead EOT Crane (25/5 Ton) Supply and Installation",
          category="Industrial Machinery", nature="Goods", method="OTM", budget=26_000_000,
          location="Alam Steel Corporation Rolling Mill, Sitakunda, Chattogram", days=150,
          scope="Design, manufacture, supply, erection and load testing of double-girder EOT cranes for the rolling mill bay, per IS 3177 / FEM standards.",
          items=[("Double-Girder EOT Crane 25/5 t", "22.5 m span, 12 m lift, M7 duty class, VFD controls, radio remote", 2, "Units", 13_000_000)]),
        T(title="Annual Maintenance of Rolling Mill Gearboxes and Drives",
          category="Maintenance Services", nature="Services", method="RFQ", budget=9_000_000,
          location="Alam Steel Corporation Rolling Mill, Sitakunda, Chattogram", days=365,
          scope="Preventive and breakdown maintenance of 18 mill stands, including vibration analysis, oil analysis and 4-hour emergency response.",
          items=[("Rolling Mill Maintenance (Monthly)", "18 stands, condition monitoring, spares at cost, 24x7 on-call team", 12, "Months", 750_000)]),
        T(title="Energy Audit and Furnace Efficiency Consultancy",
          category="Energy Consultancy", nature="Consultancy", method="RFP", budget=3_500_000,
          location="Alam Steel Corporation, Sitakunda, Chattogram", days=120,
          scope="Detailed energy audit of the melt shop and reheating furnace with recommendations to reduce specific power consumption by at least 8%.",
          items=[("Detailed Energy Audit", "ISO 50002 methodology, SREDA-accredited auditor, investment-grade report", 1, "Lot", 3_500_000)]),
    ],
    # 8. Siddiqua Fashion House
    [
        T(title="Supply of Premium Cotton Lawn Fabric for Eid Collection",
          category="Fabrics", nature="Goods", method="RFQ", budget=12_600_000,
          location="Siddiqua Fashion House Production Unit, Mirpur-11, Dhaka", days=45,
          scope="Digitally printed cotton lawn fabric for the upcoming festive collection, per approved artwork and colour standards (Pantone TCX).",
          items=[("Printed Cotton Lawn 80x80/100x100", "58 inch width, 110 GSM, reactive digital print, shrinkage <= 3%", 42_000, "Yards", 300)]),
        T(title="Interior Fit-Out of Flagship Retail Outlet, Dhanmondi",
          category="Interior Works", nature="Works", method="OTM", budget=15_000_000,
          location="Siddiqua Fashion House Flagship Store, Road 27, Dhanmondi, Dhaka", days=75,
          scope="Complete interior fit-out of a 6,500 sq ft retail space including false ceiling, lighting, display fixtures, trial rooms, flooring and signage.",
          items=[("Retail Interior Fit-Out", "Turnkey, as per approved 3D design and BOQ, including MEP works", 6_500, "Sq Ft", 2_300)]),
        T(title="E-commerce Website and Mobile App Development",
          category="Software & IT Services", nature="Services", method="RFP", budget=5_500_000,
          location="Siddiqua Fashion House Corporate Office, Banani, Dhaka", days=150,
          scope="Design and development of a headless e-commerce platform with Android/iOS apps, local payment gateway integration (bKash, Nagad, cards) and courier API integration.",
          items=[("E-commerce Platform & Apps", "Headless CMS, PWA, Android/iOS, payment and courier integration, 1 year support", 1, "Lot", 5_500_000)]),
        T(title="Industrial Sewing Machines for New Production Line",
          category="Garments Machinery", nature="Goods", method="OTM", budget=8_800_000,
          location="Siddiqua Fashion House Production Unit, Mirpur-11, Dhaka", days=60,
          scope="Direct-drive lockstitch and overlock machines with servo motors, installation and operator training for a new 40-machine line.",
          items=[("Direct-Drive Lockstitch Machine", "Auto thread trimmer, servo motor, needle positioning, with table and stand", 40, "Units", 220_000)]),
        T(title="Creative Agency for Brand Campaign and Photoshoots (12 Months)",
          category="Advertising & Marketing", nature="Services", method="RFP", budget=6_000_000,
          location="Siddiqua Fashion House Corporate Office, Banani, Dhaka", days=365,
          scope="Retainer-based creative agency for seasonal campaigns, lookbook photoshoots, social media content and influencer management.",
          items=[("Creative Agency Retainer (Monthly)", "Campaign concept, 4 shoots per season, 60 social creatives per month", 12, "Months", 500_000)]),
    ],
    # 9. Islam Logistics Services
    [
        T(title="Procurement of 10 Covered Vans (7.5 Ton)",
          category="Commercial Vehicles", nature="Goods", method="OTM", budget=48_000_000,
          location="Islam Logistics Fleet Depot, Tejgaon, Dhaka", days=90,
          scope="Brand-new covered vans with registration, route permits and a 3-year/150,000 km warranty for the expanding fleet.",
          items=[("Covered Van 7.5 Ton", "Diesel, 150+ HP, 20 ft steel-sheet body, GPS tracker pre-installed", 10, "Units", 4_800_000)]),
        T(title="GPS Fleet Tracking and Telematics Solution",
          category="IT & Telematics", nature="Services", method="RFQ", budget=3_600_000,
          location="Islam Logistics Operations Centre, Tejgaon, Dhaka", days=365,
          scope="Supply, installation and 3-year subscription of vehicle trackers with fuel sensors, driver behaviour monitoring and a web/mobile dashboard for 120 vehicles.",
          items=[("GPS Tracker with Fuel Sensor", "4G tracker, capacitive fuel sensor, engine immobiliser, 3-year platform subscription", 120, "Units", 30_000)]),
        T(title="Construction of Inland Container Depot Yard Pavement",
          category="Civil Works", nature="Works", method="OTM", budget=38_000_000,
          location="Islam Logistics ICD, Bhatiary, Chattogram", days=180,
          scope="Heavy-duty RCC pavement for container stacking (4-high laden), with drainage, lighting masts and reefer plug-in points.",
          items=[("Heavy-Duty RCC Pavement", "300 mm M35 concrete, 250 mm aggregate base, joints and drainage", 12_000, "Sq Metre", 3_150)]),
        T(title="Supply of Diesel Forklifts (3 Ton)",
          category="Material Handling Equipment", nature="Goods", method="ReverseAuction", budget=14_400_000,
          location="Islam Logistics Warehouses, Tongi and Chattogram", days=60,
          scope="Diesel counterbalance forklifts with side-shift, triplex mast, operator training and 2 years of comprehensive service.",
          items=[("Diesel Forklift 3.0 t", "4.5 m triplex mast, side shifter, pneumatic tyres, EPA-compliant engine", 8, "Units", 1_800_000)]),
        T(title="Warehouse Management System (WMS) Implementation",
          category="Software & IT Services", nature="Services", method="RFP", budget=7_000_000,
          location="Islam Logistics Operations Centre, Tejgaon, Dhaka", days=180,
          scope="Cloud WMS for 5 warehouses with RF scanning, slotting, wave picking, billing module and client portal.",
          items=[("WMS Implementation", "5 sites, 80 RF users, client portal, API integration with TMS, 2 years support", 1, "Lot", 7_000_000)]),
    ],
    # 10. Chowdhury Agro Industries
    [
        T(title="Supply of Hybrid Maize Seed for Contract Farming Programme",
          category="Agricultural Inputs", nature="Goods", method="OTM", budget=9_000_000,
          location="Chowdhury Agro Seed Store, Bogura", days=30,
          scope="Certified hybrid maize seed for 3,000 contract-farming households in Bogura and Dinajpur, BADC/SCA registered varieties only.",
          items=[("Hybrid Maize Seed", "SCA-certified, germination >= 90%, purity >= 98%, 1 kg packs", 18_000, "Kg", 500)]),
        T(title="Construction of 5,000 MT Cold Storage Facility",
          category="Agro Infrastructure", nature="Works", method="OTM", budget=120_000_000,
          location="Chowdhury Agro Industrial Park, Sherpur, Bogura", days=300,
          scope="Design-build of a multi-chamber potato cold storage with PUF insulated panels, ammonia refrigeration and backup generator.",
          items=[("5,000 MT Cold Storage (Design-Build)", "8 chambers, 2–4 °C, PUF panels 100 mm, ammonia plant, 500 kVA genset", 1, "Lot", 120_000_000)]),
        T(title="Rice Mill Automation — Colour Sorter and Polisher",
          category="Food Processing Machinery", nature="Goods", method="RFQ", budget=18_500_000,
          location="Chowdhury Agro Auto Rice Mill, Naogaon", days=90,
          scope="Supply and commissioning of CCD colour sorters and silky polishers to upgrade the 20 TPH auto rice mill.",
          items=[("CCD Rice Colour Sorter", "5 chutes, 320 channels, 6–8 TPH, 99.9% sorting accuracy", 3, "Units", 4_500_000),
                 ("Silky Water Polisher", "4–5 TPH, stainless steel, low broken ratio", 2, "Units", 2_500_000)]),
        T(title="Supply of Poultry Feed Ingredients — Soybean Meal",
          category="Animal Feed Ingredients", nature="Goods", method="ReverseAuction", budget=42_000_000,
          location="Chowdhury Agro Feed Mill, Gazipur", days=60,
          scope="Hi-pro soybean meal for broiler and layer feed production, with aflatoxin and protein test reports per consignment.",
          items=[("Soybean Meal (Hi-Pro)", "Protein >= 46%, moisture <= 12%, aflatoxin <= 20 ppb", 700, "MT", 60_000)]),
        T(title="Agricultural Value Chain Study and Farmer Training Consultancy",
          category="Agricultural Consultancy", nature="Consultancy", method="RFP", budget=4_000_000,
          location="Bogura, Dinajpur and Rangpur districts", days=180,
          scope="Value chain analysis for maize and potato, design of good agricultural practices curriculum and training of 3,000 contract farmers.",
          items=[("Value Chain Study & Training Programme", "Baseline survey, GAP curriculum, 100 training batches, endline evaluation", 1, "Lot", 4_000_000)]),
    ],
    # 11. Haque Electronics Ltd.
    [
        T(title="SMT Pick-and-Place Line for PCB Assembly",
          category="Electronics Manufacturing Equipment", nature="Goods", method="OTM", budget=95_000_000,
          location="Haque Electronics Factory, Bangabandhu Hi-Tech City, Kaliakair, Gazipur", days=120,
          scope="Complete SMT line (screen printer, SPI, pick-and-place, reflow oven, AOI) for smartphone and LED driver PCB assembly.",
          items=[("Complete SMT Line", "Screen printer, 3D SPI, 2 x high-speed P&P (80k CPH), 10-zone reflow, 3D AOI", 1, "Lot", 95_000_000)]),
        T(title="Supply of Electronic Components — LED Driver ICs and Passives",
          category="Electronic Components", nature="Goods", method="RFQ", budget=16_000_000,
          location="Haque Electronics Component Store, Kaliakair, Gazipur", days=45,
          scope="Authorised-distributor supply of LED driver ICs, MLCC capacitors and SMD resistors with full traceability and CoC.",
          items=[("LED Driver IC", "Constant current, SOP-8, authorised distributor only, reel packing", 400_000, "Pcs", 25),
                 ("MLCC Capacitor 0603 Assorted", "X7R, 10% tolerance, reel packing", 2_000_000, "Pcs", 3)]),
        T(title="Showroom Network Expansion — Interior Works for 8 Outlets",
          category="Interior Works", nature="Works", method="OTM", budget=24_000_000,
          location="Dhaka, Chattogram, Khulna, Rajshahi, Sylhet, Barishal, Rangpur and Mymensingh", days=120,
          scope="Standardised interior fit-out for 8 brand showrooms following the Haque Electronics retail design guideline.",
          items=[("Showroom Interior Fit-Out", "Approx. 1,500 sq ft each, turnkey with lighting, display and signage", 8, "Outlets", 3_000_000)]),
        T(title="Environmental Test Chamber for Product Reliability Lab",
          category="Laboratory Equipment", nature="Goods", method="RFQ", budget=7_500_000,
          location="Haque Electronics R&D Centre, Kaliakair, Gazipur", days=90,
          scope="Temperature-humidity test chambers for product reliability and IEC 60068 environmental testing, with calibration and training.",
          items=[("Temperature & Humidity Chamber", "-70 to +150 °C, 20–98% RH, 1,000 L, programmable controller", 2, "Units", 3_750_000)]),
        T(title="After-Sales Service Centre Operations Outsourcing",
          category="Customer Service", nature="Services", method="RFP", budget=18_000_000,
          location="12 service centres across Bangladesh", days=730,
          scope="Operation of authorised service centres including technician staffing, spare-parts handling, CRM ticketing and TAT-based SLAs.",
          items=[("Service Centre Operations (Monthly)", "12 centres, 60 technicians, CRM integration, TAT <= 72 hours", 24, "Months", 750_000)]),
    ],
    # 12. Nahar Food & Beverages
    [
        T(title="PET Bottle Filling and Capping Line (24,000 BPH)",
          category="Food Processing Machinery", nature="Goods", method="OTM", budget=110_000_000,
          location="Nahar Food & Beverages Plant, Rupganj, Narayanganj", days=180,
          scope="Rinsing-filling-capping monoblock with blow moulder, labeller, shrink wrapper and conveyors for carbonated soft drinks.",
          items=[("CSD Filling Line 24,000 BPH", "Blow moulder, rinser-filler-capper, sleeve labeller, shrink wrapper, conveyors", 1, "Lot", 110_000_000)]),
        T(title="Supply of Food-Grade Sugar Syrup Concentrates and Flavours",
          category="Food Ingredients", nature="Goods", method="RFQ", budget=19_500_000,
          location="Nahar Food & Beverages Plant, Rupganj, Narayanganj", days=90,
          scope="Supply of natural and nature-identical flavours (mango, orange, lychee) with BSTI and Halal certification.",
          items=[("Beverage Flavour Concentrate", "Halal certified, shelf life >= 12 months, 25 kg HDPE drums", 13_000, "Kg", 1_500)]),
        T(title="Distribution Partner for Secondary Sales — Chattogram Division",
          category="Distribution Services", nature="Services", method="RFP", budget=30_000_000,
          location="Chattogram Division (11 districts)", days=730,
          scope="Appointment of a distribution partner with warehousing, delivery vans and a sales force covering 9,000 retail outlets.",
          items=[("Secondary Distribution Service (Monthly)", "Warehouse, 25 delivery vans, 80 sales reps, DMS reporting", 24, "Months", 1_250_000)]),
        T(title="Laboratory Analysis and FSSC 22000 Certification Support",
          category="Quality Consultancy", nature="Consultancy", method="RFP", budget=2_800_000,
          location="Nahar Food & Beverages Plant, Rupganj, Narayanganj", days=180,
          scope="Gap analysis, HACCP plan revision, internal auditor training and certification-audit support for FSSC 22000 v6.",
          items=[("FSSC 22000 Certification Support", "Gap audit, documentation, training, pre-certification audit", 1, "Lot", 2_800_000)]),
        T(title="Corrugated Cartons for Beverage Packaging — Annual Supply",
          category="Packaging Materials", nature="Goods", method="ReverseAuction", budget=14_000_000,
          location="Nahar Food & Beverages Plant, Rupganj, Narayanganj", days=365,
          scope="5-ply printed corrugated cartons for 250 ml and 500 ml PET packs, with monthly call-off delivery.",
          items=[("5-Ply Printed Corrugated Carton", "BCT >= 450 kgf, 4-colour flexo print, as per approved die-line", 700_000, "Pcs", 20)]),
    ],
    # 13. Anam Power & Energy Co.
    [
        T(title="Supply of 33/11 kV Power Transformers (20/26.66 MVA)",
          category="Electrical Equipment", nature="Goods", method="OTM", budget=140_000_000,
          location="Anam Power 33/11 kV Substation, Mirsarai Economic Zone, Chattogram", days=210,
          scope="Design, manufacture, type testing, supply and commissioning of ONAN/ONAF power transformers with OLTC.",
          items=[("Power Transformer 20/26.66 MVA", "33/11 kV, ONAN/ONAF, Dyn11, OLTC ±10%, IEC 60076", 2, "Units", 70_000_000)]),
        T(title="Heavy Fuel Oil Supply for 100 MW HFO Power Plant",
          category="Fuel", nature="Goods", method="OTM", budget=380_000_000,
          location="Anam Power 100 MW HFO Plant, Keraniganj, Dhaka", days=90,
          scope="Supply of HFO 180 cSt delivered by barge/tanker, with independent quantity and quality survey per delivery.",
          items=[("Heavy Fuel Oil 180 cSt", "ISO 8217 RMG 180, sulphur <= 3.5%, delivered ex-barge", 4_000, "MT", 95_000)]),
        T(title="Major Overhaul of Gas Engine Generator Sets",
          category="Power Plant Maintenance", nature="Services", method="RFQ", budget=45_000_000,
          location="Anam Power 50 MW Gas Engine Plant, Ashuganj, Brahmanbaria", days=120,
          scope="Major overhaul (64,000 running-hours) of 4 gas engine gensets by OEM-certified engineers, including genuine spare parts.",
          items=[("Major Overhaul — Gas Genset", "OEM-certified, 64k RH overhaul scope, genuine spares, performance test", 4, "Units", 11_250_000)]),
        T(title="SCADA and Protection Relay Upgradation",
          category="Automation & Control", nature="Works", method="OTM", budget=28_000_000,
          location="Anam Power substations at Mirsarai and Ashuganj", days=180,
          scope="Replacement of legacy protection relays with IEC 61850 numerical relays and integration with a new substation SCADA system.",
          items=[("Substation SCADA & Protection Upgrade", "IEC 61850 relays, RTU/gateway, HMI, fibre network, FAT/SAT", 1, "Lot", 28_000_000)]),
        T(title="Owner's Engineer Consultancy for 150 MW Combined Cycle Project",
          category="Engineering Consultancy", nature="Consultancy", method="RFP", budget=60_000_000,
          location="Proposed project site, Meghnaghat, Narayanganj", days=900,
          scope="Owner's engineer services covering EPC tender design, bid evaluation, design review, construction supervision and commissioning oversight.",
          items=[("Owner's Engineer Services", "Feasibility review, EPC bid docs, supervision through COD", 1, "Lot", 60_000_000)]),
    ],
    # 14. Yeasmin Healthcare Solutions
    [
        T(title="Supply of ICU Ventilators and Patient Monitors",
          category="Medical Equipment", nature="Goods", method="OTM", budget=38_000_000,
          location="Yeasmin General Hospital, Mirpur-10, Dhaka", days=60,
          scope="ICU-grade invasive/non-invasive ventilators and multi-parameter patient monitors with a central station, installation and clinical training.",
          items=[("ICU Ventilator", "Invasive & NIV, adult/paediatric/neonatal, 15-inch touch screen, US FDA/CE", 10, "Units", 2_600_000),
                 ("Multi-Parameter Patient Monitor", "ECG, SpO2, NIBP, IBP x2, EtCO2, 15-inch display, central station link", 30, "Units", 400_000)]),
        T(title="Medical Gas Pipeline System Installation",
          category="Hospital Engineering Works", nature="Works", method="OTM", budget=22_000_000,
          location="Yeasmin General Hospital New Wing, Mirpur-10, Dhaka", days=120,
          scope="Design, supply and installation of an HTM 02-01 compliant medical gas pipeline (O2, medical air, vacuum) for 150 beds, ICU and OT.",
          items=[("Medical Gas Pipeline System", "HTM 02-01, copper pipes, outlets, alarms, zone valves, manifolds", 1, "Lot", 22_000_000)]),
        T(title="Hospital Information Management System (HIMS)",
          category="Health IT", nature="Services", method="RFP", budget=12_000_000,
          location="Yeasmin General Hospital and 4 diagnostic centres, Dhaka", days=240,
          scope="Implementation of an integrated HIMS covering OPD, IPD, pharmacy, LIS, RIS/PACS, billing and HL7/FHIR interoperability.",
          items=[("HIMS Implementation", "Web-based, HL7/FHIR, 400 users, data migration, 3 years AMC", 1, "Lot", 12_000_000)]),
        T(title="Annual Supply of Surgical Consumables and Disposables",
          category="Medical Consumables", nature="Goods", method="ReverseAuction", budget=16_500_000,
          location="Yeasmin General Hospital Central Store, Mirpur-10, Dhaka", days=365,
          scope="Framework supply of surgical gloves, syringes, IV cannulas, sutures and drapes with DGDA registration and monthly call-offs.",
          items=[("Sterile Surgical Gloves (Pairs)", "Latex, powder-free, EN 455 / ASTM D3577, sizes 6.0–8.5", 300_000, "Pairs", 30),
                 ("Disposable Syringe 5 ml", "Luer lock, sterile, ISO 7886-1, DGDA registered", 500_000, "Pcs", 15)]),
        T(title="Biomedical Waste Management Services (2 Years)",
          category="Waste Management", nature="Services", method="RFQ", budget=4_800_000,
          location="Yeasmin General Hospital and diagnostic centres, Dhaka", days=730,
          scope="Segregated collection, transport and treatment of biomedical waste as per the Medical Waste (Management and Processing) Rules 2008.",
          items=[("Biomedical Waste Management (Monthly)", "Daily collection, colour-coded bins, DoE-licensed treatment facility", 24, "Months", 200_000)]),
    ],
    # 15. Rahman Marine Services
    [
        T(title="Dry-Docking and Hull Repair of Coastal Oil Tanker",
          category="Ship Repair", nature="Works", method="OTM", budget=35_000_000,
          location="Approved shipyard in Chattogram or Narayanganj", days=60,
          scope="Class-supervised dry-docking of a 3,500 DWT coastal tanker: hull blasting and painting, steel renewal, propeller polishing and sea-chest overhaul.",
          items=[("Dry-Docking & Hull Repair Package", "As per DNV/BV class survey, approx. 40 t steel renewal, full hull coating", 1, "Lot", 35_000_000)]),
        T(title="Supply of Marine Lubricants — Annual Contract",
          category="Marine Supplies", nature="Goods", method="RFQ", budget=12_000_000,
          location="Rahman Marine Base, Sadarghat and Chattogram Outer Anchorage", days=365,
          scope="Supply of cylinder oil, system oil and hydraulic oil for a fleet of 14 vessels with delivery on board at designated ports.",
          items=[("Marine System Oil SAE 30", "TBN 5–7, OEM-approved for medium-speed engines, 208 L drums", 60_000, "Litres", 200)]),
        T(title="Crew Manning and Ship Management Services",
          category="Ship Management", nature="Services", method="RFP", budget=26_000_000,
          location="Rahman Marine fleet operating in Bangladesh coastal waters", days=730,
          scope="Crew recruitment, certification (STCW), payroll and technical ship management for 6 coastal vessels.",
          items=[("Ship Management & Crewing (Monthly)", "6 vessels, STCW-certified crew, ISM/ISPS compliance", 24, "Months", 1_083_000)]),
        T(title="Life-Saving and Fire-Fighting Appliances for Fleet",
          category="Marine Safety Equipment", nature="Goods", method="OTM", budget=8_500_000,
          location="Rahman Marine Base, Chattogram", days=45,
          scope="SOLAS-approved liferafts, lifejackets, immersion suits and fire extinguishers with flag-state approval and annual servicing.",
          items=[("Inflatable Liferaft 25-Person", "SOLAS/MED approved, davit-launch, with HRU and A-pack", 12, "Units", 450_000)]),
        T(title="Hydrographic Survey of Karnaphuli River Berth Approach",
          category="Survey Services", nature="Consultancy", method="RFP", budget=3_200_000,
          location="Karnaphuli River, Chattogram", days=60,
          scope="Multibeam bathymetric survey, tidal observation and dredging volume estimate for the jetty berth approach channel.",
          items=[("Hydrographic Survey", "Multibeam echo sounder, IHO S-44 Order 1a, charts and dredging report", 1, "Lot", 3_200_000)]),
    ],
    # 16. Jahan Chemical Industries
    [
        T(title="Supply of Caustic Soda Flakes (98%) — 1,200 MT",
          category="Industrial Chemicals", nature="Goods", method="ReverseAuction", budget=84_000_000,
          location="Jahan Chemical Industries, BSCIC Chemical Industrial Park, Munshiganj", days=90,
          scope="Supply of caustic soda flakes in 25 kg HDPE bags with COA per lot and staggered monthly delivery.",
          items=[("Caustic Soda Flakes 98%", "NaOH >= 98%, Na2CO3 <= 0.5%, 25 kg bags with liner", 1_200, "MT", 70_000)]),
        T(title="Stainless Steel Reactor Vessels (5 KL) Fabrication",
          category="Process Equipment", nature="Goods", method="OTM", budget=18_000_000,
          location="Jahan Chemical Industries, BSCIC Chemical Industrial Park, Munshiganj", days=120,
          scope="Design and fabrication of jacketed SS316L reactors with agitators, per ASME Section VIII Div. 1, including hydro-test and third-party inspection.",
          items=[("Jacketed SS316L Reactor 5 KL", "ASME VIII Div. 1, limpet jacket, anchor agitator 15 kW, FLP motor", 4, "Units", 4_500_000)]),
        T(title="Hazardous Chemical Storage Warehouse Construction",
          category="Industrial Construction", nature="Works", method="OTM", budget=42_000_000,
          location="Jahan Chemical Industries, BSCIC Chemical Industrial Park, Munshiganj", days=210,
          scope="Pre-engineered steel warehouse with spill containment, fire-rated partitions, sprinklers, explosion-proof lighting and ventilation per NFPA 400.",
          items=[("Hazardous Storage Warehouse", "3,000 sq m PEB, bunded floor, sprinkler and gas detection, NFPA 400", 3_000, "Sq Metre", 14_000)]),
        T(title="Process Safety Management (PSM) and HAZOP Study",
          category="Safety Consultancy", nature="Consultancy", method="RFP", budget=4_500_000,
          location="Jahan Chemical Industries, BSCIC Chemical Industrial Park, Munshiganj", days=120,
          scope="HAZOP and LOPA studies for 3 process units, PSM gap assessment against OSHA 1910.119 and emergency response plan update.",
          items=[("HAZOP, LOPA & PSM Assessment", "IEC 61882 HAZOP, certified facilitator, action tracking register", 1, "Lot", 4_500_000)]),
        T(title="Laboratory Chemicals and Reagents — Annual Supply",
          category="Laboratory Supplies", nature="Goods", method="RFQ", budget=5_000_000,
          location="Jahan Chemical Industries QC Laboratory, Munshiganj", days=365,
          scope="AR/GR-grade reagents, volumetric solutions and reference standards from reputed brands with COA and batch traceability.",
          items=[("Analytical Reagents (Assorted)", "AR/GR grade, with COA, as per attached item list", 1, "Lot", 5_000_000)]),
    ],
    # 17. Rashid Transport & Shipping
    [
        T(title="Procurement of 20 Prime Movers for Container Haulage",
          category="Commercial Vehicles", nature="Goods", method="OTM", budget=190_000_000,
          location="Rashid Transport Depot, Patenga, Chattogram", days=120,
          scope="6x4 prime movers suitable for 40 ft container haulage on the Dhaka–Chattogram corridor, with 3 years of AMC.",
          items=[("6x4 Prime Mover", "380+ HP diesel, fifth-wheel, air brakes with ABS, Euro-IV or higher", 20, "Units", 9_500_000)]),
        T(title="Container Trailer (40 ft Skeletal) Supply",
          category="Commercial Vehicles", nature="Goods", method="RFQ", budget=36_000_000,
          location="Rashid Transport Depot, Patenga, Chattogram", days=90,
          scope="Tri-axle 40 ft skeletal container trailers with twist locks, air suspension and LED lighting.",
          items=[("40 ft Skeletal Trailer", "Tri-axle, 13 t axles, air suspension, 12 twist locks", 20, "Units", 1_800_000)]),
        T(title="Fleet Tyre Supply and Management Contract",
          category="Automotive Supplies", nature="Goods", method="ReverseAuction", budget=24_000_000,
          location="Rashid Transport Depots, Chattogram and Dhaka", days=365,
          scope="Supply of radial truck tyres with fitment, pressure monitoring, retreading programme and cost-per-km reporting.",
          items=[("Radial Truck Tyre 11R22.5", "Tubeless, 16 PR, all-position, DOT/ECE marked", 1_200, "Pcs", 20_000)]),
        T(title="Freight Forwarding and Customs Clearing Services",
          category="Freight & Customs", nature="Services", method="RFP", budget=15_000_000,
          location="Chattogram Port, Benapole and Dhaka Airport", days=730,
          scope="Licensed C&F agent for import/export clearance, documentation, port handling and delivery of approx. 3,000 TEUs per year.",
          items=[("C&F and Forwarding Service (Monthly)", "Licensed C&F, ASYCUDA World filing, port and ICD handling", 24, "Months", 625_000)]),
        T(title="Driver Training and Road Safety Programme",
          category="Training Services", nature="Services", method="RFQ", budget=2_400_000,
          location="Rashid Transport Training Centre, Chattogram", days=180,
          scope="Defensive-driving, fatigue management and heavy vehicle training for 250 drivers, with BRTA-aligned certification.",
          items=[("Driver Training Programme", "Classroom + simulator + on-road, 250 drivers, certification", 250, "Trainees", 9_600)]),
    ],
    # 18. Akhter Digital Media
    [
        T(title="Broadcast Studio Equipment Upgrade (4K)",
          category="Broadcast Equipment", nature="Goods", method="OTM", budget=58_000_000,
          location="Akhter Digital Media Studio Complex, Tejgaon, Dhaka", days=120,
          scope="Supply, installation and integration of 4K studio cameras, production switcher, IP routing, and graphics system for two studios.",
          items=[("4K Studio Camera Chain", "2/3 inch 3-CMOS, 4K HDR, CCU, 22x box lens, pedestal", 6, "Sets", 6_500_000),
                 ("4K Production Switcher", "2 M/E, 12G-SDI/IP, 40 inputs, integrated DVE", 1, "Unit", 19_000_000)]),
        T(title="Content Delivery Network (CDN) and OTT Streaming Platform",
          category="Cloud & Streaming Services", nature="Services", method="RFP", budget=14_400_000,
          location="Akhter Digital Media, Tejgaon, Dhaka", days=365,
          scope="Managed OTT platform with live and VOD streaming, DRM, CDN with local PoPs, subscription billing and analytics.",
          items=[("OTT Platform & CDN (Monthly)", "Live + VOD, Widevine/FairPlay DRM, local PoP, 200k concurrent capacity", 12, "Months", 1_200_000)]),
        T(title="Production of Documentary Series on Bangladesh Heritage",
          category="Media Production", nature="Services", method="RFP", budget=9_000_000,
          location="Various locations across Bangladesh", days=240,
          scope="Research, scripting, filming (4K), editing and post-production of a 10-episode documentary series (26 minutes each).",
          items=[("Documentary Episode (26 min)", "4K production, research, script, colour grading, sound mix, subtitles", 10, "Episodes", 900_000)]),
        T(title="Media Asset Management and Archive Storage",
          category="IT Hardware", nature="Goods", method="RFQ", budget=12_500_000,
          location="Akhter Digital Media Studio Complex, Tejgaon, Dhaka", days=90,
          scope="MAM software with a 500 TB tiered storage system (NAS + LTO-9 tape library) and migration of existing archive.",
          items=[("MAM & Tiered Storage System", "500 TB usable NAS, LTO-9 library, MAM licences for 50 users", 1, "Lot", 12_500_000)]),
        T(title="Digital Marketing and Social Media Management Agency",
          category="Advertising & Marketing", nature="Services", method="RFQ", budget=4_800_000,
          location="Akhter Digital Media, Tejgaon, Dhaka", days=365,
          scope="Paid media planning, SEO, social media management and monthly performance reporting across Facebook, YouTube and TikTok.",
          items=[("Digital Marketing Retainer (Monthly)", "Media planning, content calendar, community management, analytics", 12, "Months", 400_000)]),
    ],
    # 19. Hossain Real Estate Ltd.
    [
        T(title="Piling Works for 14-Storey Residential Project, Bashundhara",
          category="Foundation Works", nature="Works", method="OTM", budget=46_000_000,
          location="Hossain Real Estate Project Site, Block-K, Bashundhara R/A, Dhaka", days=120,
          scope="Bored cast-in-situ piles (600 mm dia, 30 m depth) including pile load tests, integrity tests and pile cap excavation.",
          items=[("Bored Cast-in-Situ Pile 600 mm", "30 m depth, M30 concrete, reinforcement as per drawing, PIT test", 320, "Nos", 143_750)]),
        T(title="Supply and Installation of Passenger Lifts",
          category="Vertical Transportation", nature="Goods", method="OTM", budget=36_000_000,
          location="Hossain Real Estate Projects, Bashundhara and Uttara, Dhaka", days=180,
          scope="Machine-room-less passenger lifts with VVVF drives, ARD, and a 2-year free maintenance period.",
          items=[("MRL Passenger Lift 13-Person", "1,000 kg, 1.75 m/s, 15 stops, VVVF, ARD, EN 81-20/50", 6, "Units", 6_000_000)]),
        T(title="Aluminium Windows and Glass Curtain Wall Works",
          category="Facade Works", nature="Works", method="OTM", budget=28_000_000,
          location="Hossain Real Estate Commercial Project, Gulshan Avenue, Dhaka", days=150,
          scope="Design, fabrication and installation of unitised curtain wall with DGU low-e glass and thermally broken aluminium windows.",
          items=[("Unitised Curtain Wall", "6+12+6 mm DGU low-e glass, thermally broken aluminium, structural silicone", 4_000, "Sq Metre", 7_000)]),
        T(title="Architectural Design Consultancy for Mixed-Use Development",
          category="Architectural Consultancy", nature="Consultancy", method="RFP", budget=12_000_000,
          location="Proposed site at Purbachal Expressway, Dhaka", days=270,
          scope="Master planning, architectural, landscape and MEP design with RAJUK approval support for a 3-acre mixed-use development.",
          items=[("Architectural & MEP Design Services", "Concept to tender drawings, RAJUK approvals, BIM Level 2", 1, "Lot", 12_000_000)]),
        T(title="Facility Management Services for Completed Apartment Projects",
          category="Facility Management", nature="Services", method="RFQ", budget=9_600_000,
          location="6 completed residential projects in Dhaka", days=730,
          scope="Integrated facility management: housekeeping, security, MEP maintenance, lift and generator operation, and resident help desk.",
          items=[("Integrated FM Service (Monthly)", "6 buildings, 70 staff, CMMS reporting, 24x7 emergency response", 24, "Months", 400_000)]),
    ],
    # 20. Islam Green Energy Corp.
    [
        T(title="EPC of 5 MWp Ground-Mounted Solar Power Plant",
          category="Renewable Energy", nature="Works", method="OTM", budget=380_000_000,
          location="Islam Green Energy Solar Park, Mongla, Bagerhat", days=270,
          scope="Turnkey EPC including land development, module mounting, inverters, 33 kV evacuation, SCADA and 2 years of O&M.",
          items=[("5 MWp Solar PV Plant (EPC)", "Tier-1 bifacial modules, single-axis tracker option, 33 kV switchyard", 1, "Lot", 380_000_000)]),
        T(title="Supply of Lithium Iron Phosphate Battery Energy Storage System",
          category="Energy Storage", nature="Goods", method="OTM", budget=95_000_000,
          location="Islam Green Energy Solar Park, Mongla, Bagerhat", days=150,
          scope="Containerised 2 MWh LFP BESS with PCS, EMS, fire suppression and grid-code compliant controls.",
          items=[("Containerised LFP BESS 2 MWh", "LFP cells, 1 MW PCS, EMS, FM-200 fire suppression, 6,000 cycles", 1, "Lot", 95_000_000)]),
        T(title="Solar Home Systems for Off-Grid Char Areas",
          category="Renewable Energy", nature="Goods", method="ReverseAuction", budget=30_000_000,
          location="Char areas of Kurigram and Gaibandha districts", days=120,
          scope="Supply and installation of solar home systems with PAYGo metering for 3,000 off-grid households, IDCOL technical standard compliant.",
          items=[("Solar Home System 100 Wp", "100 Wp panel, 100 Ah LiFePO4, 4 LED lights, fan, PAYGo controller", 3_000, "Sets", 10_000)]),
        T(title="Wind Resource Assessment Study — Coastal Belt",
          category="Energy Consultancy", nature="Consultancy", method="RFP", budget=8_500_000,
          location="Cox's Bazar and Patuakhali coastal belts", days=365,
          scope="12-month wind measurement campaign with 100 m met masts and LiDAR, energy yield assessment and bankable feasibility report.",
          items=[("Wind Resource Assessment", "2 met masts (100 m), LiDAR, IEC 61400-12-1, P50/P90 yield report", 1, "Lot", 8_500_000)]),
        T(title="Operation and Maintenance of Rooftop Solar Portfolio (15 MWp)",
          category="O&M Services", nature="Services", method="RFQ", budget=12_000_000,
          location="42 industrial rooftop sites in Dhaka, Gazipur and Chattogram", days=730,
          scope="Preventive and corrective O&M, module cleaning, thermography, inverter servicing and performance-ratio guarantee reporting.",
          items=[("Rooftop Solar O&M (Monthly)", "15 MWp portfolio, PR guarantee >= 78%, 24-hour response SLA", 24, "Months", 500_000)]),
    ],
]


# ─── Payload Builders ───────────────────────────────────────────────────────

def fmt_bdt(amount):
    return f"BDT {amount:,.0f}"


def build_description(org_name, spec, bid_bond):
    lines = [
        f"{org_name} invites sealed electronic bids from eligible and qualified bidders for the "
        f"\"{spec['title']}\". {spec['scope']}",
        "",
        "Scope of Supply / Work:",
    ]
    for name, specs, qty, uom, _ in spec["items"]:
        lines.append(f"• {name} — {qty:,} {uom} ({specs})")
    lines += [
        "",
        f"Delivery / Site Location: {spec['location']}.",
        f"Completion Period: {spec['days']} days from the date of the Notification of Award (NOA).",
        "",
        "Key Terms:",
        f"• Estimated budget: up to {fmt_bdt(spec['budget'])} (inclusive of VAT and AIT).",
        f"• Bid security: {fmt_bdt(bid_bond)} as a pay order or unconditional bank guarantee from a scheduled bank.",
        "• Bid validity: 120 days from the submission deadline.",
        "• Payment terms: as per the General and Particular Conditions of Contract in the attached tender documents.",
        "• Evaluation: technically responsive bids will be evaluated on the lowest evaluated cost basis"
        if spec["method"] != "RFP" else
        "• Evaluation: Quality and Cost Based Selection (QCBS) with 70:30 technical-to-financial weightage.",
        "",
        "Bidders must review the attached Technical Specifications and Bill of Quantities, and submit all "
        "required documents before the deadline. Late or incomplete submissions will not be considered. "
        f"{org_name} reserves the right to accept or reject any or all bids without assigning any reason.",
    ]
    return "\n".join(lines)


def build_eligibility(spec):
    experience_years = 5 if spec["budget"] >= 20_000_000 else 3
    return (
        f"Bidders must be legally registered in Bangladesh (or have a local agent for foreign bidders) with a valid "
        f"trade license, TIN and VAT registration. Minimum {experience_years} years of experience in "
        f"{spec['category'].lower()} with at least 2 similar contracts completed in the last 5 years. "
        f"Average annual turnover of at least {fmt_bdt(spec['budget'] * 1.5)} over the last 3 years and "
        f"liquid assets or credit line of at least {fmt_bdt(spec['budget'] * 0.2)}. "
        f"Bidders must not be blacklisted by any government or private organisation."
    )


def build_tender_payload(org_name, spec, index):
    # Stagger dates so the tenders do not all close on the same day
    now = datetime.now(timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    public_date = now
    pre_bid = (now + timedelta(days=7 + index)).replace(hour=5)       # 11:00 Dhaka time
    deadline = (now + timedelta(days=21 + index * 4)).replace(hour=6)  # 12:00 Dhaka time
    opening = deadline + timedelta(hours=2)

    bid_bond = round(spec["budget"] * 0.02, -3)
    items = [
        {
            "lot_number": f"LOT-{i}",
            "item_name": name,
            "specifications": specs,
            "quantity": qty,
            "unit_of_measure": uom,
            "estimated_unit_price": price,
        }
        for i, (name, specs, qty, uom, price) in enumerate(spec["items"], start=1)
    ]

    return {
        "title": spec["title"],
        "description": build_description(org_name, spec, bid_bond),
        "procurement_nature": spec["nature"],
        "procurement_method": spec["method"],
        "category": spec["category"],
        "eligibility_of_tenderer": build_eligibility(spec),
        "visibility_type": "Public",
        "package_type": "PackagedLots" if len(items) > 1 else "SingleItem",
        "budget_min": round(spec["budget"] * 0.8, -3),
        "budget_max": spec["budget"],
        "bid_bond_amount": bid_bond,
        "security_required": True,
        "submission_deadline": deadline.isoformat() + "Z",
        "tender_public_date": public_date.isoformat() + "Z",
        "pre_bid_meeting": pre_bid.isoformat() + "Z",
        "tender_opening_date": opening.isoformat() + "Z",
        "required_seller_docs": REQUIRED_SELLER_DOCS,
        "items": items,
    }


def document_names(spec):
    if spec["nature"] == "Consultancy":
        return ["Terms of Reference (ToR)", "Request for Proposal Document"]
    if spec["nature"] == "Works":
        return ["Technical Specifications & Drawings", "Bill of Quantities (BOQ)"]
    if spec["nature"] == "Services":
        return ["Scope of Services & SLA", "Price Schedule"]
    return ["Technical Specifications", "Bill of Quantities & Price Schedule"]


# ─── API Calls ──────────────────────────────────────────────────────────────

def login(email):
    session = requests.Session()
    r = session.post(LOGIN_URL, json={"email": email, "password": COMMON_PASSWORD}, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"Login failed (HTTP {r.status_code}): {r.text[:300]}")
    return session


def publish_tender(session, payload, doc_names):
    handles = [open(BLANK_PDF_PATH, "rb") for _ in doc_names]
    try:
        files = [
            ("files", (f"{name.lower().replace(' ', '_').replace('&', 'and')}.pdf", fh, "application/pdf"))
            for name, fh in zip(doc_names, handles)
        ]
        data = {"tender_data": json.dumps(payload), "file_names": json.dumps(doc_names)}
        return session.post(PUBLISH_URL, data=data, files=files, timeout=180)
    finally:
        for fh in handles:
            fh.close()


def main():
    parser = argparse.ArgumentParser(description="Create demo tenders on ProcureNext")
    parser.add_argument("--limit", type=int, default=len(ACCOUNTS), help="number of accounts to process")
    args = parser.parse_args()

    if not os.path.exists(BLANK_PDF_PATH):
        print(f"❌ ERROR: Blank PDF not found: {BLANK_PDF_PATH}")
        sys.exit(1)
    assert len(TENDERS_BY_ACCOUNT) == len(ACCOUNTS)
    assert all(len(t) == TENDERS_PER_ACCOUNT for t in TENDERS_BY_ACCOUNT)

    print("=" * 70)
    print("  ProcureNext — Create Demo Tenders")
    print("=" * 70)

    created, skipped, failed = 0, 0, []

    for acc_no, (account, specs) in enumerate(list(zip(ACCOUNTS, TENDERS_BY_ACCOUNT))[: args.limit], start=1):
        org = account["organizationName"]
        print(f"\n[{acc_no:2d}/{args.limit}] {account['name']} — {org}")
        try:
            session = login(account["email"])
        except Exception as e:
            print(f"   ❌ {e}")
            failed.append((account["email"], "login", str(e)))
            continue

        cost = session.get(PRICING_URL, timeout=30).json().get("tender_publish_cost", 0)
        existing = {t.get("title") for t in session.get(MY_TENDERS_URL, timeout=60).json()}

        for idx, spec in enumerate(specs):
            if spec["title"] in existing:
                print(f"   ⏭  Already exists: {spec['title']}")
                skipped += 1
                continue

            balance = session.get(BALANCE_URL, timeout=30).json().get("credit_balance", 0)
            if balance < cost:
                msg = f"insufficient tokens ({balance} < {cost})"
                print(f"   ❌ {spec['title']}: {msg}")
                failed.append((account["email"], spec["title"], msg))
                continue

            payload = build_tender_payload(org, spec, idx)
            r = publish_tender(session, payload, document_names(spec))
            if r.status_code == 201:
                print(f"   ✅ #{r.json().get('tender_id')} {spec['title']}")
                created += 1
            else:
                print(f"   ❌ {spec['title']}: HTTP {r.status_code} {r.text[:300]}")
                failed.append((account["email"], spec["title"], f"HTTP {r.status_code}: {r.text[:300]}"))
            time.sleep(0.5)

    print("\n" + "=" * 70)
    print(f"  Created: {created}   Skipped (existing): {skipped}   Failed: {len(failed)}")
    for email, title, msg in failed:
        print(f"   - {email} | {title} | {msg}")
    print("=" * 70)


if __name__ == "__main__":
    main()
