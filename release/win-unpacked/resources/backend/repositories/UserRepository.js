import { BaseRepository } from "./BaseRepository.js";
import User from "../models/User.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.model.findOne({ email }).exec();
  }

  async updateRefreshToken(userId, token) {
    return this.model.findByIdAndUpdate(userId, { refreshToken: token }, { new: true }).exec();
  }
}

export const userRepository = new UserRepository();
