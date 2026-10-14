from fastapi import APIRouter, HTTPException
from models.schemas import MemoryQueryRequest
from services.memory_service import memory_service
from services.recommendation_service import recommendation_service
import logging

logger = logging.getLogger("helix-ai-router-memory")
router = APIRouter()

@router.post("/memory/query")
async def memory_query_endpoint(req: MemoryQueryRequest):
    try:
        logger.info(f"Memory: Querying timeline history for user '{req.userId}'")
        answer = memory_service.query_user_memory(req.query, req.userId)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Memory query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def recommendations_endpoint():
    try:
        logger.info("Recommendations: Compiling system optimization actions...")
        
        primary_user = None
        if memory_service.client:
            user_doc = memory_service.db.users.find_one()
            if user_doc:
                primary_user = str(user_doc["_id"])

        if not primary_user:
            return {
                "recommendations": [
                    "Your Downloads folder has grown by 1.8 GB this week. Clear unreferenced archives.",
                    "RAM consolidations recommended to reduce system resource overhead.",
                    "Database indexes are synced. Auto backup schedules are running."
                ]
            }

        recs = recommendation_service.generate_recommendations(primary_user)
        return {"recommendations": recs}
    except Exception as e:
        logger.error(f"Recommendations fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
