import { BaseRepository } from "./BaseRepository.js";
import SearchHistory from "../models/SearchHistory.js";

class SearchHistoryRepository extends BaseRepository {
  constructor() {
    super(SearchHistory);
  }

  async findByUser(userId, limit = 20) {
    return this.model
      .find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async recordSearch(userId, query, searchType = "semantic", resultsCount = 0) {
    const trimmed = query.trim();
    if (!trimmed) return null;
    return this.create({
      user: userId,
      query: trimmed,
      searchType,
      resultsCount,
      timestamp: new Date(),
    });
  }

  async clearUserHistory(userId) {
    return this.model.deleteMany({ user: userId }).exec();
  }
}

export const searchHistoryRepository = new SearchHistoryRepository();
