import { BaseRepository } from "./BaseRepository.js";
import Analytics from "../models/Analytics.js";

class AnalyticsRepository extends BaseRepository {
  constructor() {
    super(Analytics);
  }

  async getRecentAnalytics(userId, limit = 7) {
    return this.model.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }
}

export const analyticsRepository = new AnalyticsRepository();
