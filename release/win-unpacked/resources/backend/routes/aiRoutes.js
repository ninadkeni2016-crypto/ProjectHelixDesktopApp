import express from "express";
import {
  chat,
  getConversations,
  getConversationById,
  createConversation,
  deleteConversation,
  semanticSearch,
  getSearchHistory,
  clearSearchHistory,
  deleteSearchHistoryItem,
  mockRecommend,
  mockSummarize,
  mockCategorize,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// AI Chat Turn & Conversations Management
router.post("/chat", protect, chat);
router.get("/conversations", protect, getConversations);
router.post("/conversations", protect, createConversation);
router.get("/conversations/:id", protect, getConversationById);
router.delete("/conversations/:id", protect, deleteConversation);

// AI Vector / Semantic Search & Search History
router.post("/search", protect, semanticSearch);
router.get("/search/history", protect, getSearchHistory);
router.delete("/search/history", protect, clearSearchHistory);
router.delete("/search/history/:id", protect, deleteSearchHistoryItem);

// AI Recommendations & Summaries
router.post("/recommend", protect, mockRecommend);
router.post("/summarize", protect, mockSummarize);
router.post("/categorize", protect, mockCategorize);

export default router;
