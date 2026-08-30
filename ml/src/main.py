import logging

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile

from src.bid_evaluator import score_tender_bids
from src.schemas import (
    ProcurementDocument,
    TenderEvaluationRequest,
    TenderEvaluationResponse,
    TextEmbedRequest,
    TextEmbedResponse,
)
from src.tender_parser import generate_embedding, parse_and_embed_tender_pdf

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="ProcureNext ML Service", version="1.0.0")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


@app.post("/documents/tender/parse", response_model=ProcurementDocument)
async def parse_tender_document(file: UploadFile = File(...)) -> ProcurementDocument:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")
        return parse_and_embed_tender_pdf(content)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Tender PDF parsing failed")
        raise HTTPException(status_code=500, detail=f"Failed to parse tender PDF: {exc}") from exc


@app.post("/embeddings/text", response_model=TextEmbedResponse)
async def embed_text(payload: TextEmbedRequest) -> TextEmbedResponse:
    try:
        embedding = generate_embedding(payload.text)
        return TextEmbedResponse(embedding=embedding)
    except Exception as exc:
        logger.exception("Text embedding failed")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {exc}") from exc


@app.post("/evaluations/tender/score", response_model=TenderEvaluationResponse)
async def score_tender_bids_endpoint(payload: TenderEvaluationRequest) -> TenderEvaluationResponse:
    try:
        return score_tender_bids(payload)
    except Exception as exc:
        logger.exception("Bid evaluation scoring failed")
        raise HTTPException(status_code=500, detail=f"Failed to score bids: {exc}") from exc
