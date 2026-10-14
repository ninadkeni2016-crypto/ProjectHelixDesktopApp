import { BaseRepository } from "./BaseRepository.js";
import Conversation from "../models/Conversation.js";

class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  async findByUser(userId, limit = 30) {
    return this.model
      .find({ user: userId })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .exec();
  }

  async findOneUserConversation(id, userId) {
    return this.model.findOne({ _id: id, user: userId }).exec();
  }

  async touch(id) {
    return this.model.findByIdAndUpdate(id, { lastMessageAt: new Date() }, { new: true }).exec();
  }
}

export const conversationRepository = new ConversationRepository();
