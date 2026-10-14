import os
import logging
from PIL import Image
from config.settings import settings
from services.embedding_service import embedding_service
from services.chromadb_service import chromadb_service

logger = logging.getLogger("helix-ai-ocr")

class OCRService:
    def __init__(self):
        self.tesseract_cmd = settings.TESSERACT_CMD
        if self.tesseract_cmd:
            try:
                import pytesseract
                pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
                logger.info(f"Tesseract OCR path explicitly configured: {self.tesseract_cmd}")
            except Exception as e:
                logger.error(f"Failed to set tesseract path: {str(e)}")

    def extract_text_from_image(self, file_path: str) -> str:
        try:
            import pytesseract
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception as e:
            logger.error(f"Image OCR failed: {str(e)}. Pytesseract/Tesseract might not be installed.")
            return f"[OCR Failed - Tesseract OCR executable not found on host path. Filename: {os.path.basename(file_path)}]"

    def extract_text_from_pdf(self, file_path: str) -> str:
        try:
            import fitz  
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            
            if not text.strip():
                logger.info("PDF selectable text is empty. Attempting image OCR fallback...")
                try:
                    import pytesseract
                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        pix = page.get_pixmap()
                        img_data = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        text += pytesseract.image_to_string(img_data)
                except Exception as ocr_err:
                    logger.error(f"PDF fallback OCR failed: {str(ocr_err)}")
            return text.strip()
        except Exception as e:
            logger.error(f"PDF Extraction failed: {str(e)}.")
            return f"[PDF Extraction failed for file: {os.path.basename(file_path)}]"

    def process_and_index_file(self, file_path: str, user_id: str) -> dict:
        ext = os.path.splitext(file_path)[1].lower()
        extracted_text = ""

        if ext == ".pdf":
            extracted_text = self.extract_text_from_pdf(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp"]:
            extracted_text = self.extract_text_from_image(file_path)
        else:
            extracted_text = f"Unsupported file type for OCR index: {os.path.basename(file_path)}"

        if extracted_text:
            embedding = embedding_service.get_embedding(extracted_text[:1000])
            doc_id = f"ocr-{user_id}-{hash(file_path)}"
            metadata = {
                "name": os.path.basename(file_path),
                "path": file_path,
                "user": user_id,
                "char_count": len(extracted_text)
            }
            chromadb_service.add_to_collection("ocr_text", doc_id, extracted_text, embedding, metadata)
            logger.info(f"Indexed OCR output for: {os.path.basename(file_path)}")

        return {
            "success": True,
            "filename": os.path.basename(file_path),
            "text": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
        }

ocr_service = OCRService()
