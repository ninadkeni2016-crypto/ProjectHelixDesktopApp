import logging
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("helix-ai-embeddings")

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = None
        self.model_name = model_name
        self.vector_dim = 384 
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local embedding model '{model_name}'...")
            self.model = SentenceTransformer(model_name)
            logger.info("Local embedding model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer model ({str(e)}). Falling back to mock embeddings.")

    def get_embedding(self, text: str) -> list[float]:
        if self.model:
            try:
                return self.model.encode(text).tolist()
            except Exception as e:
                logger.error(f"Encoding failed: {str(e)}")
        return self._generate_mock_embedding(text)

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        if self.model:
            try:
                return self.model.encode(texts).tolist()
            except Exception as e:
                logger.error(f"Batch encoding failed: {str(e)}")
        return [self._generate_mock_embedding(t) for t in texts]

    def _generate_mock_embedding(self, text: str) -> list[float]:
        h = hash(text)
        np.random.seed(h % (2**32 - 1))
        vector = np.random.randn(self.vector_dim)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.tolist()

embedding_service = EmbeddingService()
