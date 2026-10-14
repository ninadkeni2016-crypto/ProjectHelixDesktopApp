import { BaseRepository } from "./BaseRepository.js";
import AuditLog from "../models/AuditLog.js";

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async getRecentLogs(limit = 100) {
    return this.model.find().sort({ timestamp: -1 }).limit(limit).populate("userId", "name email").exec();
  }

  async logEvent(userId, action, details, ipAddress = "") {
    return this.create({
      userId,
      action,
      details,
      ipAddress
    });
  }
}

export const auditLogRepository = new AuditLogRepository();
