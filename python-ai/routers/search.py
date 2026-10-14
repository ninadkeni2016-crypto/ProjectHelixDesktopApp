from fastapi import APIRouter, HTTPException
from models.schemas import SearchRequest
from services.embedding_service import embedding_service
from services.chromadb_service import chromadb_service
from services.memory_service import memory_service
import logging

logger = logging.getLogger("helix-ai-router-search")
router = APIRouter()

def sync_mongodb_to_chromadb():
    if not memory_service.client:
        return
    
    try:
        chroma_count = chromadb_service.files.count()
        mongo_count = memory_service.db.files.count_documents({})
        if chroma_count >= mongo_count and chroma_count > 0:
            return

        logger.info(f"Syncing MongoDB ({mongo_count} files) to ChromaDB ({chroma_count} indexed)...")
        mongo_files = list(memory_service.db.files.find({}))
        if not mongo_files:
            return

        batch_size = 150
        ids = []
        documents = []
        embeddings = []
        metadatas = []

        for f in mongo_files:
            file_id = str(f["_id"])
            user_id = str(f.get("user", ""))
            name = f.get("name", "")
            path = f.get("path", "")
            category = f.get("category", "other")
            raw_tags = f.get("tags", [])
            tags = ",".join(raw_tags) if isinstance(raw_tags, list) else str(raw_tags)
            
            desc = f"File name: {name}. Location: {path}. Category: {category}. Tags: {tags}"
            vector = embedding_service.get_embedding(desc)

            ids.append(file_id)
            documents.append(desc)
            embeddings.append(vector)
            metadatas.append({
                "name": name,
                "path": path,
                "category": category,
                "tags": tags,
                "user": user_id
            })

            if len(ids) >= batch_size:
                chromadb_service.files.upsert(
                    ids=ids,
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas
                )
                ids, documents, embeddings, metadatas = [], [], [], []

        if ids:
            chromadb_service.files.upsert(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
        logger.info(f"ChromaDB file sync completed. Total indexed: {chromadb_service.files.count()}")
    except Exception as e:
        logger.error(f"Failed to auto-sync files to ChromaDB: {str(e)}")

@router.post("/search")
async def search_endpoint(req: SearchRequest):
    try:
        sync_mongodb_to_chromadb()

        query = req.query
        logger.info(f"Search: Processing query '{query}'")
        
        query_embedding = embedding_service.get_embedding(query)
        where_filter = {"user": req.userId} if req.userId else None
        matches = chromadb_service.query_collection("files", query_embedding, n_results=10, where=where_filter)
        
        # Fallback to general results if user filter matched nothing
        if not matches and where_filter:
            matches = chromadb_service.query_collection("files", query_embedding, n_results=10)

        results = []
        for m in matches:
            meta = m.get("metadata") or {}
            dist = float(m.get("distance", 1.0))
            # Smooth normalized similarity score [0.10 - 0.99]
            sim_score = max(0.1, min(0.99, round(1.0 / (1.0 + (dist * 0.5)), 3)))
            results.append({
                "name": meta.get("name"),
                "path": meta.get("path"),
                "category": meta.get("category", "other"),
                "score": sim_score,
                "snippet": m.get("document", "")
            })
            
        return {"query": query, "results": results}
    except Exception as e:
        logger.error(f"Search route failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
