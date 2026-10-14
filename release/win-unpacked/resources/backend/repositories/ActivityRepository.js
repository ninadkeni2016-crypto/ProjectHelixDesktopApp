import { BaseRepository } from "./BaseRepository.js";
import Activity from "../models/Activity.js";

class ActivityRepository extends BaseRepository {
  constructor() {
    super(Activity);
  }

  async getRecentActivities(userId, limit = 10) {
    return this.model.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async findRecent(userId, limit = 10) {
    return this.getRecentActivities(userId, limit);
  }
}

export const activityRepository = new ActivityRepository();
