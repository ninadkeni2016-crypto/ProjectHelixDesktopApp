import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
import logging
import os

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/ai_service.log", mode="a")
    ]
)
logger = logging.getLogger("helix-ai-app")

app = FastAPI(
    title="Project Helix AI Engine",
    description="FastAPI companion microservice processing vector semantic searches, memory recalls, and Gemini prompt inferences.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.chat import router as chat_router
from routers.search import router as search_router
from routers.ocr import router as ocr_router
from routers.summarize import router as summarize_router
from routers.memory import router as memory_router

app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(search_router, prefix="/api", tags=["Search"])
app.include_router(ocr_router, prefix="/api", tags=["OCR"])
app.include_router(summarize_router, prefix="/api", tags=["Summarize"])
app.include_router(memory_router, prefix="/api", tags=["Memory"])

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Project Helix AI Engine",
        "docs": "/docs"
    }

if (__name__ == "__main__"):
    logger.info(f"Starting Project Helix AI Service on {settings.HOST}:{settings.PYTHON_AI_PORT}")
    uvicorn.run("app:app", host=settings.HOST, port=settings.PYTHON_AI_PORT, reload=False)
