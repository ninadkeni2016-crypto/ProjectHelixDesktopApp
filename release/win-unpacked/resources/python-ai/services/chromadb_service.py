import os
import logging
import chromadb
from config.settings import settings

logger = logging.getLogger("helix-ai-chromadb")

class ChromaDBService:
    def __init__(self):
        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)
        logger.info(f"Initializing persistent ChromaDB client at: {persist_dir}")
        self.client = chromadb.PersistentClient(path=persist_dir)
        
        self.files = self.client.get_or_create_collection("files")
        self.ocr_text = self.client.get_or_create_collection("ocr_text")
        self.activities = self.client.get_or_create_collection("activities")
        self.notes = self.client.get_or_create_collection("notes")
        self.documents = self.client.get_or_create_collection("documents")
        self.memory = self.client.get_or_create_collection("memory")
        logger.info("ChromaDB collections loaded successfully.")

    def add_to_collection(self, collection_name: str, doc_id: str, document: str, embedding: list[float], metadata: dict):
        try:
            collection = getattr(self, collection_name)
            collection.add(
                ids=[doc_id],
                documents=[document],
                embeddings=[embedding],
                metadatas=[metadata]
            )
        except Exception as e:
            logger.error(f"ChromaDB error adding to collection '{collection_name}': {str(e)}")

    def query_collection(self, collection_name: str, query_embedding: list[float], n_results: int = 5, where: dict = None) -> list[dict]:
        try:
            collection = getattr(self, collection_name)
            kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": n_results
            }
            if where:
                kwargs["where"] = where
            results = collection.query(**kwargs)
            formatted = []
            if results and results.get("ids"):
                ids = results["ids"][0]
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0] if "distances" in results else [0]*len(ids)
                
                for idx in range(len(ids)):
                    formatted.append({
                        "id": ids[idx],
                        "document": documents[idx],
                        "metadata": metadatas[idx],
                        "distance": distances[idx]
                    })
            return formatted
        except Exception as e:
            logger.error(f"ChromaDB query failed in '{collection_name}': {str(e)}")
            return []

chromadb_service = ChromaDBService()
