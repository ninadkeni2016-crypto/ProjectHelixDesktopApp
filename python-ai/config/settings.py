import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'backend', '.env')

load_dotenv(env_path)

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/helix")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "data/chroma")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")
    PYTHON_AI_PORT: int = int(os.getenv("PYTHON_AI_PORT", "8000"))
    HOST: str = "127.0.0.1"

settings = Settings()
