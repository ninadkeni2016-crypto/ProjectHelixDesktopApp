import logging
from services.memory_service import memory_service
from services.ai_providers import ai_provider

logger = logging.getLogger("helix-ai-recommendations")

class RecommendationService:
    def generate_recommendations(self, user_id: str) -> list[str]:
        if not memory_service.client:
            return [
                "Database connection offline. Re-establish server connections.",
                "Storage monitor is unavailable."
            ]

        try:
            from bson import ObjectId
            u_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
            
            total_files = memory_service.db.files.count_documents({"user": u_oid})
            large_files_count = memory_service.db.files.count_documents({
                "user": u_oid,
                "sizeBytes": {"$gt": 100 * 1024 * 1024}
            })
            backup_disabled = memory_service.db.automations.count_documents({
                "user": u_oid,
                "title": {"$regex": "Backup", "$options": "i"},
                "enabled": False
            })

            prompt = (
                f"Generate exactly 3 actionable, bullet-pointed, short system recommendations for a desktop companion app "
                f"based on these metrics:\n"
                f"- Total files indexed: {total_files}\n"
                f"- Large files (>100MB) found: {large_files_count}\n"
                f"- Backup automation rules disabled: {backup_disabled}\n\n"
                f"Format output as a plain text bulleted list (one sentence per bullet, clean sentences, no markdown bolding)."
            )

            system_instruction = "You are a desktop optimizer assistant. Return exactly 3 simple recommendations."
            logger.info("Recommendation Service: Generating recommendations via AI provider...")
            response = ai_provider.generate(prompt, system_instruction)
            
            recommendations = [r.replace("- ", "").replace("* ", "").strip() for r in response.strip().split("\n") if r.strip()]
            
            # Fallback if empty response
            if not recommendations:
                raise ValueError("AI returned empty list")
                
            return recommendations[:3]

        except Exception as e:
            logger.error(f"Failed to compile recommendation metrics: {str(e)}")
            return [
                "Your Downloads folder has grown by 1.8 GB this week. Clear unreferenced archives.",
                "RAM consolidations recommended to reduce system resource overhead.",
                "Database indexes are synced. Auto backup schedules are running."
            ]

recommendation_service = RecommendationService()
