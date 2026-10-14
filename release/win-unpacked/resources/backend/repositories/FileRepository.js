import { BaseRepository } from "./BaseRepository.js";
import File from "../models/File.js";

class FileRepository extends BaseRepository {
  constructor() {
    super(File);
  }

  async searchFiles(userId, criteria, pagination = { page: 1, limit: 20 }) {
    const { search, category, favorite, extension, folder, minSize, maxSize, dateFrom, dateTo, sort } = criteria;
    const filter = { user: userId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    if (category) filter.category = category;
    if (favorite !== undefined) filter.favorite = favorite === "true" || favorite === true;
    if (extension) filter.extension = extension.toLowerCase();
    if (folder) filter.path = { $regex: `^${folder}`, $options: "i" };

    if (minSize || maxSize) {
      filter.sizeBytes = {};
      if (minSize) filter.sizeBytes.$gte = Number(minSize);
      if (maxSize) filter.sizeBytes.$lte = Number(maxSize);
    }

    if (dateFrom || dateTo) {
      filter.modifiedDate = {};
      if (dateFrom) filter.modifiedDate.$gte = new Date(dateFrom);
      if (dateTo) filter.modifiedDate.$lte = new Date(dateTo);
    }

    let sortObj = { modifiedDate: -1 };
    if (sort) {
      if (sort === "name_asc") sortObj = { name: 1 };
      else if (sort === "name_desc") sortObj = { name: -1 };
      else if (sort === "size_asc") sortObj = { sizeBytes: 1 };
      else if (sort === "size_desc") sortObj = { sizeBytes: -1 };
      else if (sort === "date_asc") sortObj = { modifiedDate: 1 };
      else if (sort === "date_desc") sortObj = { modifiedDate: -1 };
    }

    const pageNum = Math.max(1, parseInt(pagination.page || 1));
    const limitNum = Math.max(1, parseInt(pagination.limit || 20));
    const skip = (pageNum - 1) * limitNum;

    const items = await this.model.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .exec();

    const total = await this.model.countDocuments(filter);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    };
  }

  async findDuplicates(userId) {
    return this.model.aggregate([
      { $match: { user: userId } },
      { $group: {
          _id: { name: "$name", sizeBytes: "$sizeBytes" },
          count: { $sum: 1 },
          files: { $push: "$$ROOT" }
      }},
      { $match: { count: { $gt: 1 } } }
    ]).exec();
  }

  async findLargeFiles(userId, sizeThreshold = 104857600) { // 100MB
    return this.model.find({ user: userId, sizeBytes: { $gt: sizeThreshold } }).sort({ sizeBytes: -1 }).exec();
  }

  async findRecentlyModified(userId, minutes = 1440) { // last 24h
    const dateLimit = new Date(Date.now() - minutes * 60 * 1000);
    return this.model.find({ user: userId, modifiedDate: { $gte: dateLimit } }).sort({ modifiedDate: -1 }).exec();
  }

  async findOldUnusedFiles(userId, daysLimit = 180) { // 180 days
    const dateLimit = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000);
    return this.model.find({ user: userId, modifiedDate: { $lte: dateLimit } }).sort({ modifiedDate: 1 }).exec();
  }
  async findOrCreate(data) {
    const existing = await this.model.findOne({ path: data.path, user: data.user }).exec();
    if (existing) {
      return existing;
    }
    return this.create(data);
  }
}

export const fileRepository = new FileRepository();
