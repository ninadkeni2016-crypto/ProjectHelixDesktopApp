import { AIProvider } from "./AIProvider.js";
import { aiGatewayService } from "../services/AIGatewayService.js";

export class LocalLlamaProvider extends AIProvider {
  async chat(prompt, history = [], context = null) {
    const result = await aiGatewayService.chat(prompt, history, context);
    return typeof result === "object" ? result.answer || result.text : result;
  }

  async search(query, files = [], userId = null) {
    return await aiGatewayService.search(query, files, userId);
  }

  async recommend(metrics) {
    return await aiGatewayService.recommend(metrics);
  }
}
