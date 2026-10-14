import logging
from pymongo import MongoClient
from bson import ObjectId
from config.settings import settings
from services.ai_providers import ai_provider

logger = logging.getLogger("helix-ai-memory")

class MemoryService:
    def __init__(self):
        self.client = None
        try:
            logger.info("Initializing MongoDB Client connection...")
            self.client = MongoClient(settings.MONGO_URI)
            db_name = settings.MONGO_URI.split("/")[-1].split("?")[0] or "helix"
            self.db = self.client[db_name]
            logger.info(f"Connected to MongoDB database: {db_name}")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {str(e)}")

    def query_user_memory(self, query: str, user_id: str) -> str:
        if not self.client:
            return "Unable to access local database memory. Database is offline."

        try:
            # Handle ObjectId conversion if user_id matches format
            u_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
            
            activities = list(self.db.activities.find({"user": u_oid}).sort("createdAt", -1).limit(15))
            recent_files = list(self.db.files.find({"user": u_oid}).sort("modifiedDate", -1).limit(10))
            notifications = list(self.db.notifications.find({"user": u_oid}).sort("createdAt", -1).limit(5))

            act_list = []
            for a in activities:
                label = a.get("label") or a.get("desc") or a.get("title") or "Unknown activity"
                date = a.get("date") or "Recently"
                time = a.get("time") or ""
                act_list.append(f"- [{date} {time}] {label}")

            file_list = []
            for f in recent_files:
                name = f.get("name")
                mod = f.get("modifiedDate")
                file_list.append(f"- File: {name} (Modified: {mod})")

            notif_list = [f"- {n.get('msg')}" for n in notifications]

            context_str = (
                f"RECENT USER ACTIVITY TIMELINE:\n" + "\n".join(act_list) + "\n\n"
                f"RECENTLY MODIFIED FILES:\n" + "\n".join(file_list) + "\n\n"
                f"RECENT NOTIFICATIONS:\n" + "\n".join(notif_list)
            )

            system_instruction = (
                "You are Project Helix AI Companion. Answer the user query using their local computer "
                "activity memory context. Identify what they worked on yesterday, last week, or today based on context."
            )

            prompt = (
                f"Context of user activities and database files:\n{context_str}\n\n"
                f"User Question: {query}\n\n"
                f"Response:"
            )

            logger.info("Memory Service: Querying AI provider with timeline context...")
            return ai_provider.generate(prompt, system_instruction)

        except Exception as e:
            logger.error(f"Error querying memory index: {str(e)}")
            return f"An error occurred while compiling memory context: {str(e)}"

memory_service = MemoryService()
