# EdgeCache --- Distributed CDN & Edge Caching Platform

EdgeCache is a distributed CDN and edge-caching simulation built with
**Node.js, Express, Redis, Docker, React, and Socket.IO**. It
demonstrates how multiple edge servers can share cached responses,
distribute incoming traffic, reduce repeated Origin requests, and
recover from edge-node failures.

The project includes a Gateway, four Edge Server instances, a shared
Redis cache, an Origin Server, and a real-time monitoring dashboard.

## Key Features

### 1. Consistent Hashing with Virtual Nodes

-   Routes resource keys across **four Edge Server instances** using a
    consistent hashing ring.
-   Uses **MD5 hashing** and **50 virtual nodes (replicas) per physical
    Edge Server**.
-   Supports adding and removing nodes from the ring.
-   Consistent hashing limits how many keys need to be reassigned when
    the cluster membership changes, helping the system scale
    horizontally.

### 2. Redis Cache-Aside with TTL and LRU Eviction

-   Uses a shared Redis instance as the cache layer for all Edge
    Servers.
-   Checks Redis before forwarding a request to the Origin Server.
-   Stores successful Origin responses with a **30-second TTL**.
-   Configures Redis with a **100 MB maxmemory setting** and the
    `allkeys-lru` eviction policy.
-   Cache hits are served from Redis, avoiding the simulated Origin
    processing delay.

### 3. Thundering Herd Mitigation

-   Uses in-process **Promise-based request coalescing** so concurrent
    requests for the same key within one Edge Server can share an
    in-flight operation.
-   Uses **Redlock with Redis** to coordinate cache-miss work across
    Edge Server processes.
-   These mechanisms reduce redundant Origin fetches during concurrent
    cache misses. They are mitigation mechanisms rather than an
    unconditional guarantee: fallback paths can still result in
    duplicate Origin requests.

### 4. Health Monitoring and Automatic Failover

-   The Gateway periodically probes the Edge Servers at a **3-second
    health-check interval**.
-   Unhealthy nodes are removed from the consistent hashing ring.
-   Recovered nodes are added back to the ring.
-   If a request is routed to an unavailable Edge Server, the Gateway
    selects another healthy Edge Server and retries the request.
-   Failure detection and failover have been tested by stopping an Edge
    Server and observing traffic continue through the remaining healthy
    nodes.

### 5. Real-Time Monitoring Dashboard

-   Built with React and Socket.IO.
-   Displays live request logs, including cache status, request path,
    and serving Edge Server.
-   Shows Edge Server online/offline connectivity status.
-   Tracks cache HIT/MISS statistics.
-   Displays a latency matrix for comparing Edge Server latency.
-   Displays the Origin offload ratio, representing the share of
    requests served without reaching the Origin Server.

## Architecture

``` text
                         ┌──────────────────────┐
                         │      React UI        │
                         │ Monitoring Dashboard │
                         └──────────┬───────────┘
                                    │ Socket.IO telemetry
                                    │
┌────────┐      ┌──────────────────▼──────────────────┐
│ Client │ ───▶ │             Gateway                 │
└────────┘      │              :8080                  │
                │       Consistent Hashing            │
                │       Health Checks / Retry         │
                └───┬────────┬────────┬────────┬──────┘
                    │        │        │        │
                 ┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
                 │Edge 1│ │Edge 2│ │Edge 3│ │Edge 4│
                 │ :5001│ │ :5002│ │ :5003│ │ :5004│
                 └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
                    └────────┴────┬───┴────────┘
                                  │
                         ┌────────▼────────┐
                         │  Shared Redis   │
                         │     :6379       │
                         │ Cache + Redlock │
                         └────────┬────────┘
                                  │ Cache miss
                         ┌────────▼────────┐
                         │  Origin Server  │
                         │     :4000       │
                         └─────────────────┘
```

**Request flow:** The Gateway selects an Edge Server using the
consistent hashing ring. The Edge Server checks Redis for the requested
resource. On a cache hit, it returns the cached response. On a cache
miss, request coalescing and the distributed lock help coordinate the
Origin fetch; the response is then cached with the configured TTL.

The dashboard receives telemetry directly from the Edge Server Socket.IO
connections.

## Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technologies
  ----------------------------------- -----------------------------------
  Gateway and Edge Servers            Node.js, Express

  Routing                             Custom consistent hashing, MD5,
                                      virtual nodes

  Caching and coordination            Redis, ioredis, Redlock

  Request coordination                JavaScript Promises, in-process
                                      request coalescing

  Real-time telemetry                 Socket.IO

  Dashboard                           React

  Containerization                    Docker, Docker Compose
  -----------------------------------------------------------------------

## Getting Started

### Prerequisites

-   [Docker Desktop](https://www.docker.com/products/docker-desktop/)
-   Git

### 1. Clone the repository

``` bash
git clone https://github.com/sujalbanakar/edgecache-platform.git
cd edgecache-platform
```

### 2. Build and start the services

``` bash
docker compose up --build -d
```

### 3. Check running containers

``` bash
docker compose ps
```

### 4. Open the services

  Service           URL
  ----------------- -----------------------
  React Dashboard   http://localhost:3000
  Gateway           http://localhost:8080
  Origin Server     http://localhost:4000
  Redis             localhost:6379

## Testing the System

### 1. Verify cache HIT and MISS behavior

Send a request to the Gateway:

``` bash
curl http://localhost:8080/api/heavy-feed
```

-   **First request --- MISS:** The Edge Server does not find the key in
    Redis and fetches the response from the Origin Server. The Origin
    Server includes a simulated delay of approximately **1200 ms**.
-   **Subsequent request --- HIT:** The response is served from Redis
    while the cache entry remains valid.

The cache-hit latency is not presented here as a fixed sub-2 ms
benchmark because that value has not been formally measured.

### 2. Test Edge Server failover

Stop one Edge Server:

``` bash
docker stop edgecache-edge-3
```

Observe the dashboard and Gateway behavior: - The Edge Server's
connectivity status changes to offline. - The Gateway detects the
failure through its periodic health checks. - The failed node is removed
from the consistent hashing ring. - Requests are routed to another
healthy Edge Server, with retry handling when a selected Edge Server is
unavailable.

Restart the Edge Server:

``` bash
docker start edgecache-edge-3
```

After recovery, the Gateway detects the node and adds it back to the
ring.

> If your Docker Compose configuration assigns a different container
> name, use the actual name shown by `docker compose ps` in the
> `docker stop` and `docker start` commands.

### 3. Stop the project

``` bash
docker compose down
```

## Performance Notes

-   The Origin Server uses an intentional delay of approximately **1200
    ms** to make cache behavior observable during testing.
-   An approximately **80% reduction in Origin requests** was measured
    under the project's tested workload. This is workload-dependent and
    should not be interpreted as a universal reduction for every traffic
    pattern.
-   Cache responses are served from Redis, but no fixed sub-2 ms latency
    claim is made without a formal benchmark.
-   The dashboard exposes cache HIT/MISS activity, Edge Server latency
    information, and Origin offload ratio to help observe system
    behavior.

## What This Project Demonstrates

-   Horizontal scaling through multiple Edge Server instances.
-   Consistent hashing and virtual-node-based request distribution.
-   Cache-aside design with TTL and LRU eviction.
-   Local request coalescing and distributed locking.
-   Health monitoring, node recovery, and request failover.
-   Real-time monitoring using React and Socket.IO.
