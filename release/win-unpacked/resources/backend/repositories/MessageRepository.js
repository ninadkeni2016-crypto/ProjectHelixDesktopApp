import { BaseRepository } from "./BaseRepository.js";
import Message from "../models/Message.js";

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async findByConversation(conversationId, userId, limit = 100) {
    return this.model
      .find({ conversation: conversationId, user: userId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async deleteByConversation(conversationId, userId) {
    return this.model.deleteMany({ conversation: conversationId, user: userId }).exec();
  }
}

export const messageRepository = new MessageRepository();
