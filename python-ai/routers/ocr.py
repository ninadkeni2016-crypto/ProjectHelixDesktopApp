from fastapi import APIRouter, HTTPException
from models.schemas import OCRRequest
from services.ocr_service import ocr_service
import logging

logger = logging.getLogger("helix-ai-router-ocr")
router = APIRouter()

@router.post("/ocr")
async def ocr_endpoint(req: OCRRequest):
    try:
        logger.info(f"OCR: Processing file '{req.filePath}' for user '{req.userId}'")
        res = ocr_service.process_and_index_file(req.filePath, req.userId)
        return res
    except Exception as e:
        logger.error(f"OCR route failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
