import { BaseRepository } from "./BaseRepository.js";
import Automation from "../models/Automation.js";

class AutomationRepository extends BaseRepository {
  constructor() {
    super(Automation);
  }

  async findActiveRules(userId) {
    return this.model.find({ user: userId, enabled: true }).exec();
  }
}

export const automationRepository = new AutomationRepository();
