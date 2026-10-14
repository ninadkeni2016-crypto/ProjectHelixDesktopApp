from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest
from services.ai_providers import ai_provider
import logging
import json

logger = logging.getLogger("helix-ai-router-chat")
router = APIRouter()

SYSTEM_INSTRUCTION = (
    "You are Helix AI, the intelligent desktop companion inside Project Helix.\n\n"
    "Your primary responsibility is to help users understand, operate, troubleshoot "
    "and get the most out of Project Helix and their computer.\n\n"
    "You understand the available Helix features, such as AI chat, file management, "
    "semantic search, activity history, automation, system monitoring, duplicate detection, "
    "backup and recovery, security, and analytics.\n\n"
    "Prioritize project-related questions and practical assistance using actual available application context.\n\n"
    "CRITICAL ACCURACY AND FIDELITY RULES:\n"
    "1. Grounding: When answering questions regarding user files, search results, live system metrics, or activity history, strictly use the provided [CURRENT APPLICATION & SYSTEM CONTEXT]. Never invent file paths or search hits.\n"
    "2. Hardware readings: If hardware telemetry such as CPU temperature or battery is marked as 'N/A' or sensor unavailable, report it as N/A (e.g. desktop running on AC power or thermal sensor not exposed by hardware drivers). Never fabricate numerical temperature or battery readings.\n"
    "3. Real Actions: Never claim an action (such as moving, renaming, deleting, or backing up files) has succeeded unless verified by application activity context.\n"
    "4. Search Transparency: If no files match a search query, clearly explain that no matches were found in indexed folders.\n\n"
    "You can also answer general questions, discuss everyday topics, explain concepts, "
    "help with studies, write code and have natural conversations.\n\n"
    "When the user asks a general question, answer normally without unnecessarily forcing the conversation back to Project Helix.\n\n"
    "Be conversational, clear, helpful, and technically accurate."
)

FOLLOW_UP_MAP = {
    "file_search": [
        "Show the largest 10 files",
        "Find duplicate files",
        "Explain storage usage"
    ],
    "system_monitoring": [
        "Show top processes",
        "Check RAM usage",
        "Suggest performance improvements"
    ],
    "project_help": [
        "How does semantic search work in Helix?",
        "Explain the Gemini integration",
        "Review the authentication flow"
    ],
    "automation": [
        "Show my scheduled automations",
        "Help me create an automation",
        "Explain my automation history"
    ],
    "backup": [
        "Show recent backups",
        "Help me plan a backup",
        "Check backup status"
    ],
    "security": [
        "Review available security status",
        "Explain recent security events",
        "Check enabled protections"
    ],
    "activity_history": [
        "Show today's file changes",
        "Summarize weekly activity",
        "Check system logs"
    ],
    "programming": [
        "Add unit tests for this",
        "Explain time & space complexity",
        "Optimize this implementation"
    ],
    "general_chat": [
        "Tell me another one",
        "Explain a related concept",
        "Help me brainstorm ideas"
    ]
}


@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        query = req.text
        history = req.history or []
        context = req.context or {}
        intent = context.get("intent", "general_chat")

        if not query or not query.strip():
            raise HTTPException(status_code=400, detail="Message text is required.")

        logger.info(f"Chat: Received query (intent={intent}, history={len(history)})...")

        # Build prompt incorporating real application context when present
        final_prompt = query
        if context and context.get("data"):
            context_str = json.dumps(context.get("data"), indent=2)
            final_prompt = (
                f"[CURRENT APPLICATION & SYSTEM CONTEXT]\n"
                f"Category: {intent}\n"
                f"Details:\n{context_str}\n\n"
                f"[USER MESSAGE]\n{query}"
            )

        answer = ai_provider.generate(
            prompt=final_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            history=history,
        )

        # Select follow-up suggestions
        follow_ups = context.get("followUpSuggestions") or FOLLOW_UP_MAP.get(intent, FOLLOW_UP_MAP["general_chat"])

        files_found = context.get("files") or (context.get("data") and context.get("data").get("files")) or []
        return {
            "answer": answer,
            "intent": intent,
            "followUpSuggestions": follow_ups,
            "files": files_found
        }

    except ValueError as e:
        logger.error(f"Chat configuration error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

    except RuntimeError as e:
        logger.error(f"Chat API error: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))

    except NotImplementedError as e:
        logger.error(f"Chat provider error: {str(e)}")
        raise HTTPException(status_code=501, detail=str(e))

    except Exception as e:
        logger.error(f"Chat route failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
