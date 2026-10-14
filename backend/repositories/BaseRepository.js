export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, projection = null, options = {}) {
    return this.model.find(filter, projection, options).exec();
  }

  async findOne(filter = {}, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options).exec();
  }

  async findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options).exec();
  }

  async create(data) {
    const entity = new this.model(data);
    return entity.save();
  }

  async update(id, data, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, data, options).exec();
  }

  async updateMany(filter, data, options = {}) {
    return this.model.updateMany(filter, data, options).exec();
  }

  async delete(id) {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteMany(filter = {}) {
    return this.model.deleteMany(filter).exec();
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }
}
