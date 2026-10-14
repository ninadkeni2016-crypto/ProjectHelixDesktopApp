import logging
from services.embedding_service import embedding_service
from services.chromadb_service import chromadb_service
from services.ai_providers import ai_provider

logger = logging.getLogger("helix-ai-rag")

class RAGService:
    def retrieve_context(self, query: str, limit: int = 5) -> str:
        query_embedding = embedding_service.get_embedding(query)
        matches = chromadb_service.query_collection("files", query_embedding, limit)
        
        if not matches:
            return "No matching local files found in database index."
        
        context_parts = []
        for idx, match in enumerate(matches):
            meta = match["metadata"]
            name = meta.get("name", "Unknown File")
            path = meta.get("path", "Unknown Path")
            category = meta.get("category", "Other")
            tags = meta.get("tags", "")
            
            context_parts.append(
                f"{idx+1}. File: {name}\n"
                f"   Path: {path}\n"
                f"   Category: {category}\n"
                f"   Tags: {tags}\n"
            )
            
        return "\n".join(context_parts)

    def answer_query_with_rag(self, query: str) -> str:
        context = self.retrieve_context(query)
        
        system_instruction = (
            "You are Project Helix desktop AI companion. Answer the user query using the "
            "provided context of their local desktop files. Be brief, specific, and helpful."
        )
        
        prompt = (
            f"Context of local files:\n{context}\n\n"
            f"User Query: {query}\n\n"
            f"Response:"
        )
        
        logger.info(f"RAG: Submitting user query to AI provider...")
        return ai_provider.generate(prompt, system_instruction)

rag_service = RAGService()
