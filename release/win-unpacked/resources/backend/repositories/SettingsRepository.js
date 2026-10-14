import { BaseRepository } from "./BaseRepository.js";
import Settings from "../models/Settings.js";

class SettingsRepository extends BaseRepository {
  constructor() {
    super(Settings);
  }

  async findByUserId(userId) {
    return this.model.findOne({ user: userId }).exec();
  }
}

export const settingsRepository = new SettingsRepository();
