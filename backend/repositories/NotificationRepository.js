import { BaseRepository } from "./BaseRepository.js";
import Notification from "../models/Notification.js";

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async getUnread(userId) {
    return this.model.find({ user: userId, read: false }).sort({ timestamp: -1 }).exec();
  }

  async markAllRead(userId) {
    return this.model.updateMany({ user: userId, read: false }, { read: true }).exec();
  }
}

export const notificationRepository = new NotificationRepository();
