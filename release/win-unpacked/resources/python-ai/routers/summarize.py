from fastapi import APIRouter, HTTPException
from models.schemas import SummarizeRequest, ClassifyRequest
from services.ai_providers import ai_provider
import logging

logger = logging.getLogger("helix-ai-router-summarize")
router = APIRouter()

@router.post("/summarize")
async def summarize_endpoint(req: SummarizeRequest):
    try:
        logger.info("Summarize: Processing text summarization request...")
        prompt = (
            f"Please summarize the following text comprehensively. Provide a clear, brief 2-3 sentence summary:\n\n"
            f"{req.text}\n\n"
            f"Summary:"
        )
        system_instruction = "You are a text summarization assistant."
        summary = ai_provider.generate(prompt, system_instruction)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify")
async def classify_endpoint(req: ClassifyRequest):
    try:
        filename = req.text
        logger.info(f"Classify: Categorizing file name: {filename}")
        
        prompt = (
            f"Classify the file name '{filename}' into exactly one of these categories: "
            f"Documents, photos, videos, audio, Finance, Study, Design, Projects, other.\n"
            f"Return only the single category word name (case-sensitive) and nothing else."
        )
        system_instruction = "You classify files into categories."
        category = ai_provider.generate(prompt, system_instruction).strip().replace(".", "").lower()
        
        valid_cats = ["documents", "photos", "videos", "audio", "finance", "study", "design", "projects", "other"]
        if category not in valid_cats:
            category = "other"
            
        return {"category": category}
    except Exception as e:
        logger.error(f"Classification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
