import axios from "axios";
import { configService } from "../config/configService.js";
import { aiLogger } from "../utils/logger.js";

class AIGatewayService {
  constructor() {
    this.pythonServiceUrl = configService.get("PYTHON_AI_URL") || "http://localhost:8000";
    aiLogger.info(`AI Gateway: Target python microservice is: ${this.pythonServiceUrl}`);
  }

  async chat(prompt, history = [], context = null) {
    aiLogger.info(`AI Gateway -> Python: /chat request`);
    try {
      const res = await axios.post(`${this.pythonServiceUrl}/api/chat`, {
        text: prompt,
        history,
        context,
      }, {
        timeout: 60000, // 60s timeout for Gemini API calls
      });
      return res.data;
    } catch (err) {
      // Extract meaningful error from the Python service response
      const detail = err.response?.data?.detail;
      const status = err.response?.status;

      if (status === 401) {
        // API key configuration error
        throw new Error(detail || "Gemini API key is not configured or invalid. Check backend/.env");
      }

      if (status === 503) {
        // Quota or availability error
        throw new Error(detail || "Gemini API is temporarily unavailable. Please try again.");
      }

      if (status === 501) {
        // Provider not implemented
        throw new Error(detail || "Selected AI provider is not configured.");
      }

      if (detail) {
        throw new Error(`AI service error: ${detail}`);
      }

      // Network / connection error
      aiLogger.error(`AI Gateway -> Python: /chat failed: ${err.message}`);
      throw new Error(
        "Cannot reach the AI engine. Please ensure the python-ai service is running on " +
        this.pythonServiceUrl
      );
    }
  }

  async search(query, files = [], userId = null) {
    aiLogger.info(`AI Gateway -> Python: /search request`);
    try {
      const payload = { query };
      if (userId) payload.userId = String(userId);
      const res = await axios.post(`${this.pythonServiceUrl}/api/search`, payload);
      return res.data.results;
    } catch (err) {
      aiLogger.error(`AI Gateway -> Python: /search failed: ${err.message}`);
      throw new Error("Search service unavailable. Ensure python-ai is running.");
    }
  }

  async recommend(metrics) {
    aiLogger.info(`AI Gateway -> Python: /recommendations request`);
    try {
      const res = await axios.get(`${this.pythonServiceUrl}/api/recommendations`);
      return res.data.recommendations;
    } catch (err) {
      aiLogger.error(`AI Gateway -> Python: /recommendations failed: ${err.message}`);
      throw new Error("Recommendation service unavailable.");
    }
  }

  async summarize(text) {
    aiLogger.info(`AI Gateway -> Python: /summarize request`);
    try {
      const res = await axios.post(`${this.pythonServiceUrl}/api/summarize`, { text });
      return res.data.summary;
    } catch (err) {
      aiLogger.error(`AI Gateway -> Python: /summarize failed: ${err.message}`);
      throw new Error("Summarization service unavailable.");
    }
  }

  async categorize(text) {
    aiLogger.info(`AI Gateway -> Python: /classify request`);
    try {
      const res = await axios.post(`${this.pythonServiceUrl}/api/classify`, { text });
      return res.data.category;
    } catch (err) {
      aiLogger.error(`AI Gateway -> Python: /classify failed: ${err.message}`);
      return "other";
    }
  }
}

export const aiGatewayService = new AIGatewayService();
