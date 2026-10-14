import { aiGatewayService } from "../services/AIGatewayService.js";
import { projectContextService } from "../services/ProjectContextService.js";
import { fileRepository } from "../repositories/FileRepository.js";
import { conversationRepository } from "../repositories/ConversationRepository.js";
import { messageRepository } from "../repositories/MessageRepository.js";
import { searchHistoryRepository } from "../repositories/SearchHistoryRepository.js";
import Activity from "../models/Activity.js";
import { isDbConnected } from "../config/db.js";
import { configService } from "../config/configService.js";
import { logger } from "../utils/logger.js";

// @desc    Handle chat message, persist to MongoDB, call Gemini via Python AI Gateway
// @route   POST /api/v1/ai/chat
export async function chat(req, res) {
  const { text, conversationId, history, currentPage } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Text input is required" });
  }

  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized user session" });
  }

  try {
    // 1. Resolve or create Conversation in MongoDB
    let conv = null;
    if (conversationId) {
      conv = await conversationRepository.findOneUserConversation(conversationId, userId);
      if (!conv) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found or unauthorized access",
        });
      }
    } else {
      const generatedTitle =
        text.trim().length > 35
          ? text.trim().substring(0, 35) + "..."
          : text.trim();
      conv = await conversationRepository.create({
        user: userId,
        title: generatedTitle,
        lastMessageAt: new Date(),
      });
    }

    // 2. Persist incoming user message to MongoDB
    await messageRepository.create({
      conversation: conv._id,
      user: userId,
      role: "user",
      content: text.trim(),
    });

    // 3. Lightweight Intent Classification & Context Gathering
    const intent = projectContextService.classifyIntent(text);
    const contextData = await projectContextService.gatherContext(
      intent,
      text,
      userId
    );
    const followUpSuggestions = projectContextService.getFollowUpSuggestions(
      intent,
      text
    );

    const contextPayload = {
      intent,
      currentPage: currentPage || "assistant",
      data: contextData,
      followUpSuggestions,
    };

    // 4. Build history context: prefer passed history or load from MongoDB
    let historyForGateway = history;
    if (!historyForGateway || historyForGateway.length === 0) {
      const dbMessages = await messageRepository.findByConversation(
        conv._id,
        userId,
        15
      );
      historyForGateway = dbMessages.map((m) => ({
        role: m.role,
        text: m.content,
      }));
    }

    // 5. Send to Python Gemini engine
    const aiResult = await aiGatewayService.chat(
      text,
      historyForGateway,
      contextPayload
    );

    const answer =
      typeof aiResult === "object" ? aiResult.answer || aiResult.text : aiResult;
    const finalFollowUps =
      typeof aiResult === "object" && aiResult.followUpSuggestions
        ? aiResult.followUpSuggestions
        : followUpSuggestions;

    const currentModel = configService.get("GEMINI_MODEL") || "gemini-1.5-flash";

    // 6. Persist AI assistant response to MongoDB
    await messageRepository.create({
      conversation: conv._id,
      user: userId,
      role: "assistant",
      content: answer,
      provider: "gemini",
      model: currentModel,
      metadata: {
        followUpSuggestions: finalFollowUps,
        intent,
      },
    });

    // 7. Update conversation last message timestamp
    await conversationRepository.touch(conv._id);

    // 8. Record user activity log for timeline
    try {
      await Activity.create({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "project",
        label: `Helix AI: ${conv.title}`,
        iconType: "Bot",
        color: "text-purple-400",
        status: "completed",
        taskType: "ai_chat",
        user: userId,
      });
    } catch (actErr) {
      logger.warn(`Chat activity log notice: ${actErr.message}`);
    }

    const matchedFiles = contextData?.files || aiResult?.files || [];

    return res.json({
      success: true,
      role: "assistant",
      text: answer,
      answer: answer,
      conversationId: conv._id,
      conversationTitle: conv.title,
      intent,
      followUpSuggestions: finalFollowUps,
      files: matchedFiles,
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (err) {
    logger.error("Chat turn error: " + err.message);
    const message = err.message || "An unexpected error occurred with the AI service.";
    return res.status(502).json({
      success: false,
      role: "assistant",
      text: `⚠️ ${message}`,
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      error: true,
    });
  }
}

// @desc    Get user's chat conversations
// @route   GET /api/v1/ai/conversations
export async function getConversations(req, res) {
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, data: [] });
    }
    const userId = req.user._id;
    const conversations = await conversationRepository.findByUser(userId, 40);
    return res.json({
      success: true,
      data: conversations,
    });
  } catch (err) {
    logger.error("Failed to fetch conversations: " + err.message);
    return res.status(500).json({ success: false, message: "Server error fetching conversations" });
  }
}

// @desc    Get single conversation with its messages
// @route   GET /api/v1/ai/conversations/:id
export async function getConversationById(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database temporarily unavailable" });
    }
    const userId = req.user._id;
    const conv = await conversationRepository.findOneUserConversation(req.params.id, userId);
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or unauthorized",
      });
    }

    const messages = await messageRepository.findByConversation(conv._id, userId);
    return res.json({
      success: true,
      data: {
        conversation: conv,
        messages: messages.map((m) => ({
          _id: m._id,
          role: m.role,
          text: m.content,
          content: m.content,
          ts: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          followUpSuggestions: m.metadata?.followUpSuggestions,
          intent: m.metadata?.intent,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (err) {
    logger.error("Failed to fetch conversation details: " + err.message);
    return res.status(500).json({ success: false, message: "Server error fetching conversation messages" });
  }
}

// @desc    Create new conversation
// @route   POST /api/v1/ai/conversations
export async function createConversation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database temporarily unavailable" });
    }
    const userId = req.user._id;
    const title = req.body.title || "New Conversation";
    const conv = await conversationRepository.create({
      user: userId,
      title: title.trim(),
      lastMessageAt: new Date(),
    });
    return res.status(201).json({
      success: true,
      data: conv,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// @desc    Delete conversation and associated messages
// @route   DELETE /api/v1/ai/conversations/:id
export async function deleteConversation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database temporarily unavailable" });
    }
    const userId = req.user._id;
    const conv = await conversationRepository.findOneUserConversation(req.params.id, userId);
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or unauthorized",
      });
    }

    await messageRepository.deleteByConversation(conv._id, userId);
    await conversationRepository.delete(conv._id);

    return res.json({
      success: true,
      message: "Conversation deleted successfully",
      conversationId: conv._id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// @desc    Semantic search with search history logging
// @route   POST /api/v1/ai/search
export async function semanticSearch(req, res) {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, message: "Query input is required" });
  }

  const userId = req.user._id;

  try {
    const files = await fileRepository.find({ user: userId });
    let results = [];
    try {
      results = await aiGatewayService.search(query, files);
    } catch (searchErr) {
      logger.warn(`AI Gateway search notice: ${searchErr.message}`);
      // Fallback keyword search over indexed user files
      const regex = new RegExp(query.trim(), "i");
      const matched = files.filter(f => regex.test(f.name) || (f.tags && f.tags.some(t => regex.test(t))));
      results = matched.map((f, i) => ({
        name: f.name,
        score: 0.85 - (i * 0.05),
        path: f.path,
        snippet: `Indexed file in ${f.category} (${f.size})`,
      }));
    }

    // Persist to SearchHistory in MongoDB
    await searchHistoryRepository.recordSearch(
      userId,
      query,
      "semantic",
      results ? results.length : 0
    );

    // Record activity log
    try {
      await Activity.create({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "search",
        label: `Semantic search: "${query.trim()}"`,
        iconType: "Search",
        color: "text-blue-400",
        status: "completed",
        taskType: "semantic_search",
        user: userId,
      });
    } catch (actErr) {
      logger.warn(`Activity log notice: ${actErr.message}`);
    }

    return res.json({
      success: true,
      query,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export const mockSemanticSearch = semanticSearch;

// @desc    Get user's search history
// @route   GET /api/v1/ai/search/history
export async function getSearchHistory(req, res) {
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, data: [] });
    }
    const userId = req.user._id;
    const history = await searchHistoryRepository.findByUser(userId, 30);
    return res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// @desc    Clear user's search history
// @route   DELETE /api/v1/ai/search/history
export async function clearSearchHistory(req, res) {
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, message: "Search history cleared successfully" });
    }
    const userId = req.user._id;
    await searchHistoryRepository.clearUserHistory(userId);
    return res.json({
      success: true,
      message: "Search history cleared successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// @desc    Delete single search history item
// @route   DELETE /api/v1/ai/search/history/:id
export async function deleteSearchHistoryItem(req, res) {
  try {
    const userId = req.user._id;
    await searchHistoryRepository.model.deleteOne({ _id: req.params.id, user: userId });
    return res.json({
      success: true,
      message: "Search history item removed",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function mockRecommend(req, res) {
  try {
    const recommendations = await aiGatewayService.recommend();
    return res.json({
      success: true,
      recommendations: recommendations.map((r, i) => ({
        title: r,
        action: `action_${i}`,
        impact: "Improves diagnostics",
        reason: "Identified by AI analysis",
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function mockSummarize(req, res) {
  const { filePath } = req.body;
  try {
    const summary = await aiGatewayService.summarize(filePath || "sample file");
    return res.json({
      success: true,
      filePath,
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function mockCategorize(req, res) {
  const { name } = req.body;
  try {
    const category = await aiGatewayService.categorize(name);
    return res.json({
      success: true,
      name,
      category,
      suggestedTags: ["ai-inferred"],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export const mockAIPredictions = mockRecommend;
