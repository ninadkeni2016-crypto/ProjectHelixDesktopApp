import { logger } from "../utils/logger.js";

class QueueManager {
  constructor() {
    this.queues = {
      scan: [],
      ai: [],
      notification: [],
      backup: [],
      analytics: [],
    };
    this.running = {
      scan: false,
      ai: false,
      notification: false,
      backup: false,
      analytics: false,
    };
    this.socketServiceInstance = null;
  }

  setSocketService(socketService) {
    this.socketServiceInstance = socketService;
  }

  addTask(queueName, taskFn, metadata = {}) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const task = {
      id: `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fn: taskFn,
      metadata,
      status: "queued",
      addedAt: new Date(),
    };

    this.queues[queueName].push(task);
    logger.info(`Queue [${queueName}]: Task ${task.id} added.`);
    
    this.broadcastQueueState();
    this.processQueue(queueName);
    return task.id;
  }

  async processQueue(queueName) {
    if (this.running[queueName] || this.queues[queueName].length === 0) {
      return;
    }

    this.running[queueName] = true;
    const task = this.queues[queueName][0];
    task.status = "processing";
    task.startedAt = new Date();
    
    logger.info(`Queue [${queueName}]: Processing task ${task.id}...`);
    this.broadcastQueueState();

    try {
      await task.fn();
      task.status = "completed";
      logger.info(`Queue [${queueName}]: Completed task ${task.id}`);
    } catch (err) {
      task.status = "failed";
      task.error = err.message;
      logger.error(`Queue [${queueName}]: Failed task ${task.id} - ${err.message}`);
    } finally {
      this.queues[queueName].shift();
      this.running[queueName] = false;
      this.broadcastQueueState();
      
      this.processQueue(queueName);
    }
  }

  getQueueStatus(queueName) {
    return {
      active: this.running[queueName],
      pendingCount: this.queues[queueName].length,
      tasks: this.queues[queueName].map(t => ({
        id: t.id,
        status: t.status,
        metadata: t.metadata,
        addedAt: t.addedAt
      }))
    };
  }

  getAllStatuses() {
    const statuses = {};
    for (const name in this.queues) {
      statuses[name] = this.getQueueStatus(name);
    }
    return statuses;
  }

  broadcastQueueState() {
    if (this.socketServiceInstance) {
      this.socketServiceInstance.broadcast("queue:status", this.getAllStatuses());
    }
  }
}

export const queueManager = new QueueManager();
