class RequestCoalescer {
  constructor() {
    this.inFlight = new Map();
  }

  execute(key, asyncFn) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = asyncFn()
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}

module.exports = new RequestCoalescer();