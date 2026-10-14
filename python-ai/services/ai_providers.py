import abc
import os
import logging
from config.settings import settings

logger = logging.getLogger("helix-ai-providers")


class AIProvider(abc.ABC):
    @abc.abstractmethod
    def generate(self, prompt: str, system_instruction: str = "", history: list = None) -> str:
        pass

class GeminiProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        self.model_initialized = False

        if not self.api_key:
            logger.error(
                "GEMINI_API_KEY is not configured. "
                "Set GEMINI_API_KEY in backend/.env to enable Gemini AI responses."
            )
            return

        try:
            from google import genai

            self.client = genai.Client(api_key=self.api_key)
            self.model_initialized = True
            logger.info(
                f"Gemini client configured successfully with model: {self.model_name}"
            )
        except ImportError:
            logger.error(
                "google-genai package is not installed. "
                "Run: pip install google-genai"
            )
        except Exception as e:
            logger.error(f"Error configuring Gemini client: {str(e)}")

    def generate(self, prompt: str, system_instruction: str = "", history: list = None) -> str:
        if not self.api_key:
            raise ValueError(
                "Gemini API key is not configured. "
                "Please set GEMINI_API_KEY in your backend/.env file."
            )

        if not self.model_initialized:
            raise RuntimeError(
                "Gemini client failed to initialize. "
                "Check the server logs for details."
            )

        try:
            from google import genai
            from google.genai import types

            # Build the contents list for multi-turn conversation
            contents = []

            # Add conversation history if provided
            if history:
                for msg in history:
                    role = msg.get("role", "user")
                    text = msg.get("text", "")
                    if not text:
                        continue
                    # Map frontend roles to Gemini roles
                    gemini_role = "model" if role == "assistant" else "user"
                    contents.append(
                        types.Content(
                            role=gemini_role,
                            parts=[types.Part.from_text(text=text)],
                        )
                    )

            # Add current prompt
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                )
            )

            # Build generate config
            generate_config = types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=8192,
            )

            # Add system instruction if provided
            if system_instruction:
                generate_config.system_instruction = system_instruction

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=generate_config,
            )

            return response.text

        except Exception as e:
            error_str = str(e).lower()

            if "api_key" in error_str or "401" in error_str or "invalid" in error_str:
                raise ValueError(
                    "Invalid Gemini API key. Please check your GEMINI_API_KEY "
                    "in backend/.env and ensure it is correct."
                ) from e

            if "429" in error_str or "quota" in error_str or "rate" in error_str or "resource_exhausted" in error_str:
                raise RuntimeError(
                    "Gemini API quota exceeded. Your API usage limit has been reached. "
                    "Please wait a moment and try again, or check your Google AI Studio billing."
                ) from e

            if "503" in error_str or "unavailable" in error_str:
                raise RuntimeError(
                    "Gemini API is temporarily unavailable. Please try again in a few moments."
                ) from e

            logger.error(f"Gemini API generation failed: {str(e)}")
            raise RuntimeError(
                f"Gemini API request failed: {str(e)}"
            ) from e


class OpenAIProvider(AIProvider):
    def __init__(self):
        logger.info("OpenAIProvider instantiated. Requires OPENAI_API_KEY configuration.")

    def generate(self, prompt: str, system_instruction: str = "", history: list = None) -> str:
        raise NotImplementedError(
            "OpenAI provider is not configured. Set AI_PROVIDER=gemini to use Gemini."
        )


class LocalLlamaProvider(AIProvider):
    def __init__(self):
        logger.info("LocalLlamaProvider instantiated. Requires local model configuration.")

    def generate(self, prompt: str, system_instruction: str = "", history: list = None) -> str:
        raise NotImplementedError(
            "Local Llama provider is not configured. Set AI_PROVIDER=gemini to use Gemini."
        )


def get_ai_provider() -> AIProvider:
    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "openai":
        return OpenAIProvider()
    elif provider_name == "llama":
        return LocalLlamaProvider()
    else:
        return GeminiProvider()


ai_provider = get_ai_provider()
