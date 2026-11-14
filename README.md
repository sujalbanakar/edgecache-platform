# EdgeCache — Distributed CDN & Edge Caching Platform

A distributed, fault-tolerant edge caching and CDN simulation built with Node.js, Redis, Docker, and React. EdgeCache demonstrates horizontal scale-out routing, cache-aside deduplication, distributed lock coordination, and real-time operational telemetry.

---

## Key Architecture & Features

- **Dynamic Consistent Hashing with Virtual Nodes**: 
  - Routes inbound traffic across distributed edge instances (`edge-1`, `edge-2`, `edge-3`) using MD5 hash distribution with 50 virtual replicas per physical node.
  - Minimizes cache invalidation ripples during cluster resizing and dynamic node removal.
- **Cache-Aside Architecture with Redis**:
  - Intercepts requests at edge instances, serving cached responses in `<2ms` with configurable TTLs and `allkeys-lru` eviction policies, cutting origin compute load by over 80%.
- **Thundering Herd Mitigation**:
  - Leverages local **in-process request coalescing** (promise deduplication) combined with **Redlock distributed locking** across edge containers to guarantee only a single upstream fetch occurs for concurrent cache misses on identical keys.
- **Active Health Probing & Zero-Downtime Failover**:
  - Gateway background polling detects node downtime within 3 seconds, prunes unreachable instances from the hash ring, and transparently reroutes traffic to healthy peers.
- **Real-Time Telemetry Dashboard**:
  - Built with React and Socket.io to stream live cluster topology, per-node latency benchmarks, and origin offload ratios directly from containerized edge sockets.

---

## System Architecture Flow

```text
[ Client Request ]
       │
       ▼
[ Edge Gateway (:8080) ] ──── Consistent Hashing Ring (Virtual Nodes)
       │
       ├──► [ Edge Node 1 (:5001) ] ──┐
       ├──► [ Edge Node 2 (:5002) ] ──┼──► [ Redis LRU Cache (:6379) ]
       └──► [ Edge Node 3 (:5003) ] ──┘          │ (Cache Miss & Lock)
                                                 ▼
                                     [ Origin Server (:4000) ]
```

---

## How to Run the Project

### 1. Prerequisites
- **Docker Desktop** (with Docker Compose enabled and running)
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/sujalbanakar/edgecache-platform.git
cd edgecache-platform
```

### 3. Build & Start the Cluster
Spin up all microservices (Gateway, Edge Nodes, Origin Server, Redis, and React Dashboard) in detached mode:
```bash
docker compose up --build -d
```

Verify that all containers are running:
```bash
docker compose ps
```

### 4. Access Service Endpoints
- **Telemetry Dashboard (UI):** `http://localhost:3000`
- **Edge Gateway (API Entrypoint):** `http://localhost:8080`
- **Origin Server:** `http://localhost:4000`
- **Redis Cache:** `localhost:6379`

---

## Testing & Verification

### 1. Test Cache-Aside (Miss vs. Hit)
Send an initial request through the Gateway:
```bash
curl http://localhost:8080/api/heavy-feed
```
- **First request (`MISS`):** Takes ~1200ms (simulated origin latency) and populates Redis with a 30s TTL.
- **Second request (`HIT`):** Run the same command again—response returns in `<2ms` directly from Redis.

### 2. Test Dynamic Node Failover
1. Open the live dashboard at `http://localhost:3000`.
2. Stop one of the edge containers:
   ```bash
   docker stop edgecache-edge-3
   ```
3. The dashboard marks `edge-3` as **DOWN / FAILOVER**, and the Gateway automatically prunes it from the hash ring and routes traffic to healthy peers.
4. Restart the container to observe automatic recovery:
   ```bash
   docker start edgecache-edge-3
   ```

### 3. Stop the Cluster
To shut down and remove all running containers:
```bash
docker compose down
```