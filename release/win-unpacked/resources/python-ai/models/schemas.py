from pydantic import BaseModel
from typing import Optional, List, Any

class ChatRequest(BaseModel):
    text: str
    history: Optional[List[Any]] = []
    context: Optional[dict] = None
    currentPage: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None

class OCRRequest(BaseModel):
    filePath: str
    userId: str

class SummarizeRequest(BaseModel):
    text: str

class ClassifyRequest(BaseModel):
    text: str

class MemoryQueryRequest(BaseModel):
    query: str
    userId: str
