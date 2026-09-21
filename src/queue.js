class Queue {
  constructor({ delayMs = 2000 } = {}) {
    this.queue = [];
    this.processing = false;
    this.delayMs = delayMs;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        // Small delay between Steam sessions to reduce rate-limit risk
        setTimeout(() => this.process(), this.delayMs);
      }
    }
  }

  getLength() {
    return this.queue.length;
  }
}

module.exports = Queue;
module.exports.defaultQueue = new Queue();
