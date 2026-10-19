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

                                     