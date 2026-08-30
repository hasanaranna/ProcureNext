# ============================================================
# ml/src/tender_parser.py - Procurement Document Parsing & Embedding
# ============================================================

import os
import re
import io
import logging
import hashlib
from datetime import datetime
from typing import Optional, List, Union

from src.schemas import ProcurementDocument
try:
    import pypdf as PyPDF2
except ImportError:
    try:
        import PyPDF2
    except ImportError:
        PyPDF2 = None

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are a Document Intelligence Agent.

Your task is to extract structured information from a procurement document.

Rules:
- Extract information only from the document.
- Do not invent or hallucinate information.
- If a requested field is not present, return an empty string.
- Preserve the meaning of the original document.
- Extract the complete relevant information for each field.
"""

_EMBEDDING_MODEL = None

def get_sentence_transformer_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer('all-MiniLM-L6-v2') loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}")
            _EMBEDDING_MODEL = False
    return _EMBEDDING_MODEL if _EMBEDDING_MODEL is not False else None


def extract_text_from_pdf(pdf_source: Union[str, bytes, bytearray, io.BytesIO]) -> str:
    """
    Extract full text from PDF filepath, raw bytes, or stream.
    """
    if isinstance(pdf_source, (bytes, bytearray)):
        stream = io.BytesIO(pdf_source)
        reader = PyPDF2.PdfReader(stream)
    elif isinstance(pdf_source, str):
        if os.path.exists(pdf_source):
            reader = PyPDF2.PdfReader(pdf_source)
        else:
            stream = io.BytesIO(pdf_source.encode("latin-1", errors="ignore"))
            reader = PyPDF2.PdfReader(stream)
    elif hasattr(pdf_source, "read"):
        reader = PyPDF2.PdfReader(pdf_source)
    else:
        raise ValueError("Invalid PDF source type.")

    pages_text = []
    for i, page in enumerate(reader.pages):
        txt = page.extract_text()
        if txt:
            pages_text.append(txt)
    return "\n\n".join(pages_text)


def parse_date_heuristic(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    cleaned = re.sub(r"\s+", " ", date_str.strip())
    formats = [
        "%d-%b-%Y %H:%M",
        "%d-%B-%Y %H:%M",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d %H:%M",
        "%d-%b-%Y",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            pass
    return None


def parse_document_heuristic(text: str) -> ProcurementDocument:
    """
    Deterministic parser tailored for procurement documents & e-GP tender notices.
    """
    doc = ProcurementDocument()

    # 1. Procurement Nature
    m_nature = re.search(r"Procurement\s+Nature\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_nature:
        doc.procurement_nature = m_nature.group(1).strip()

    # 2. Procurement Method
    m_method = re.search(r"Procurement\s+Method\s*:\s*([^\n\r]+(?:\([^\)]+\))?)", text, re.IGNORECASE)
    if m_method:
        method_raw = m_method.group(1).strip()
        doc.procurement_method = re.sub(r"\s*\([^\)]*\)", "", method_raw).strip() or method_raw

    # 3. Title / Package description
    m_pkg = re.search(
        r"Tender/Proposal\s+Package\s+No\.\s+and\s+Description\s*:\s*(?:[^\n\r]+\n)?([\s\S]+?)(?=\n\s*Category\s*:|\n\s*Scheduled|\n\s*Brief\s+Description)",
        text,
        re.IGNORECASE
    )
    if m_pkg:
        title_text = m_pkg.group(1).strip()
        lines = [l.strip() for l in title_text.splitlines() if l.strip()]
        if len(lines) > 1 and re.match(r"^[a-zA-Z0-9_\-\.\/]+$", lines[0]):
            doc.title = " ".join(lines[1:])
        else:
            doc.title = " ".join(lines)
    else:
        m_brief = re.search(
            r"Brief\s+Description\s+of\s+Goods\s+and\s+Related\s+Service\s*:\s*([\s\S]+?)(?=\n\s*Evaluation\s+Type|\n\s*Document\s+Available|\n\s*Tender/Proposal)",
            text,
            re.IGNORECASE
        )
        if m_brief:
            doc.title = " ".join([l.strip() for l in m_brief.group(1).splitlines() if l.strip()])

    # 4. Description
    m_desc = re.search(
        r"Brief\s+Description\s+of\s+Goods\s+and\s+Related\s+Service\s*:\s*([\s\S]+?)(?=\n\s*Evaluation\s+Type|\n\s*Document\s+Available|\n\s*Tender/Proposal)",
        text,
        re.IGNORECASE
    )
    if m_desc:
        doc.description = " ".join([l.strip() for l in m_desc.group(1).splitlines() if l.strip()])
    elif doc.title:
        doc.description = doc.title

    # 5. Category
    m_cat = re.search(
        r"Category\s*:\s*([\s\S]+?)(?=\n\s*Scheduled|\n\s*Tender/Proposal\s+Publication|\n\s*Pre\s*-\s*Tender|\n\s*Information\s+for)",
        text,
        re.IGNORECASE
    )
    if m_cat:
        doc.category = " ".join([l.strip() for l in m_cat.group(1).splitlines() if l.strip()])
    else:
        doc.category = "Not applicable"

    # 6. Eligibility of Tenderer
    m_elig = re.search(
        r"Eligibility\s+of\s+Tenderer\s*:\s*([\s\S]+?)(?=\n\s*Brief\s+Description|\n\s*Evaluation\s+Type|\n\s*Document\s+Available)",
        text,
        re.IGNORECASE
    )
    if m_elig:
        doc.eligibility_of_tenderer = " ".join([l.strip() for l in m_elig.group(1).splitlines() if l.strip()])

    # 7. Dates & Budget
    m_pub_date = re.search(r"Scheduled\s+Tender/Proposal\s+Publication\s+Date\s+and\s+Time\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_pub_date:
        doc.tender_public_date = parse_date_heuristic(m_pub_date.group(1))

    m_close_date = re.search(r"Tender/Proposal\s+Closing\s+Date\s+and\s+Time\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_close_date:
        doc.submission_deadline = parse_date_heuristic(m_close_date.group(1))

    m_open_date = re.search(r"Tender/Proposal\s+Opening\s+Date\s+and\s+Time\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_open_date:
        doc.tender_opening_date = parse_date_heuristic(m_open_date.group(1))

    m_pre_bid = re.search(r"Pre\s*-\s*Tender/Proposal\s+meeting\s+Start\s+Date\s+and\s+Time\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_pre_bid:
        doc.pre_bid_meeting = parse_date_heuristic(m_pre_bid.group(1))

    m_security = re.search(r"Tender/Proposal\s+security\s*\(Amount\s+in\s+BDT\)\s*(\d+)", text, re.IGNORECASE)
    if m_security:
        try:
            doc.budget_max = float(m_security.group(1))
        except ValueError:
            pass

    return doc


def generate_embedding(text: str) -> List[float]:
    """
    Generate 384-dimensional vector embedding for the input text.
    Uses all-MiniLM-L6-v2 if sentence_transformers is available,
    with a deterministic fallback ensuring exactly 384 dimensions.
    """
    if not text:
        text = "tender procurement document"

    model = get_sentence_transformer_model()
    if model is not None:
        try:
            vec = model.encode(text, show_progress_bar=False)
            if hasattr(vec, "tolist"):
                return vec.tolist()
            return list(vec)
        except Exception as e:
            logger.warning(f"Error encoding with SentenceTransformer: {e}")

    # Deterministic fallback embedding generation with 384 dimensions
    import numpy as np
    dims = 384
    # Seed generator with hash of text for reproducibility
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    raw_vec = rng.standard_normal(dims)
    norm = np.linalg.norm(raw_vec)
    if norm > 0:
        raw_vec = raw_vec / norm
    return raw_vec.tolist()


def parse_and_embed_tender_pdf(pdf_source: Union[str, bytes, bytearray, io.BytesIO]) -> ProcurementDocument:
    """
    Main entry point:
    1. Extracts text from PDF
    2. Runs Groq LLM (if configured) or heuristic parser
    3. Generates 384-dimensional embedding vector on the tender description
    4. Returns structured ProcurementDocument with .embedding attribute
    """
    full_document_text = extract_text_from_pdf(pdf_source)
    
    # 1. Parse structured fields
    doc: Optional[ProcurementDocument] = None

    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        try:
            from langchain_groq import ChatGroq
            from langchain.agents import create_agent

            agent_llm = ChatGroq(
                model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                api_key=groq_api_key,
                temperature=0.1,
                stop=None
            )
            agent = create_agent(
                model=agent_llm,
                system_prompt=SYSTEM_PROMPT,
                response_format=ProcurementDocument
            )
            response = agent.invoke({
                "messages": [
                    {
                        "role": "user",
                        "content": f"Extract the required information from the following procurement document:\n\n{full_document_text}"
                    }
                ]
            })
            structured_res = response.get("structured_response")
            if isinstance(structured_res, ProcurementDocument):
                doc = structured_res
            elif isinstance(structured_res, dict):
                doc = ProcurementDocument(**structured_res)
        except Exception as e:
            logger.warning(f"Groq LLM extraction failed: {e}. Falling back to deterministic parser.")

    if doc is None or not doc.title:
        doc = parse_document_heuristic(full_document_text)

    # 2. Extract any missing dates/budget from heuristic if LLM left them empty
    h_doc = parse_document_heuristic(full_document_text)
    if not doc.submission_deadline and h_doc.submission_deadline:
        doc.submission_deadline = h_doc.submission_deadline
    if not doc.tender_public_date and h_doc.tender_public_date:
        doc.tender_public_date = h_doc.tender_public_date
    if not doc.pre_bid_meeting and h_doc.pre_bid_meeting:
        doc.pre_bid_meeting = h_doc.pre_bid_meeting
    if not doc.tender_opening_date and h_doc.tender_opening_date:
        doc.tender_opening_date = h_doc.tender_opening_date
    if not doc.budget_max and h_doc.budget_max:
        doc.budget_max = h_doc.budget_max

    # 3. Generate 384-dimensional embedding vector on the description
    text_for_embedding = doc.description or doc.title or "Procurement tender"
    embedding_vec = generate_embedding(text_for_embedding)
    doc.embedding = embedding_vec

    return doc
