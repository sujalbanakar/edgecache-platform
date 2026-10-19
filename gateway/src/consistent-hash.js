const crypto = require('crypto');

class ConsistentHash {
  constructor(nodes = [], replicas = 50) {
    this.replicas = replicas;
    this.ring = new Map();
    this.keys = [];
    this.nodes = new Set();

    nodes.forEach(node => this.addNode(node));
  }

  _hash(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  addNode(node) {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);

    for (let i = 0; i < this.replicas; i++) {
      const vNodeKey = `${node}:${i}`;
      const hash = this._hash(vNodeKey);
      this.ring.set(hash, node);
      this.keys.push(hash);
    }
    this.keys.sort();
  }

  removeNode(node) {
    if (!this.nodes.has(node)) return;
    this.nodes.delete(node);

    for (let i = 0; i < this.replicas; i++) {
      const vNodeKey = `${node}:${i}`;
      const hash = this._hash(vNodeKey);
      this.ring.delete(hash);
      const index = this.keys.indexOf(hash);
      if (index > -1) this.keys.splice(index, 1);
    }
  }

  getNode(key) {
    if (this.keys.length === 0) return null;
    const hash = this._hash(key);
    const index = this._getNearestNodeIndex(hash);
    const targetKey = this.keys[index % this.keys.length];
    return this.ring.get(targetKey);
  }

  _getNearestNodeIndex(hash) {
    let left = 0;
    let right = this.keys.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.keys[mid] === hash) return mid;
      if (this.keys[mid] < hash) left = mid + 1;
      else right = mid - 1;
    }
    return left;
  }
}

module.exports = ConsistentHash;