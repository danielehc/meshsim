# Built-in Scenarios

meshsim ships with six ready-to-run scenarios in the `configs/` directory. Each folder contains
one YAML config per service instance plus the shared `quotes.txt` and `products.txt` data files.

Launch any scenario with the interactive menu:

```sh
./run.sh
```

Or start a specific scenario directly by launching its YAML files:

```sh
# Example: start all three-tier services
./meshsim --config configs/three-tier/frontend.yaml &
./meshsim --config configs/three-tier/applogic.yaml &
./meshsim --config configs/three-tier/backend.yaml &
# then open http://localhost:8080/ui
```

---

## Scenario overview

| Scenario | Instances | Ports | Key features |
|---|---|---|---|
| [`monolith`](#monolith) | 1 | 8080 | All features in one process |
| [`two-tier`](#two-tier) | 2 | 8080–8081 | Simple client → server split |
| [`three-tier`](#three-tier) | 3 | 8080–8082 | Classic web → app → data |
| [`microservices`](#microservices) | 5 | 8080–8084 | Multiple parallel services |
| [`replication`](#replication) | 7 | 8080–8086 | Load balancer + replica sets |
| [`chaos`](#chaos) | 3 | 8080–8082 | Failure propagation demo |

---

## monolith

**Ports:** 8080

A single fat service that hosts all application features — quotes, products, and the Buy counter —
in one process with no upstreams. Use this to introduce meshsim or as a baseline before showing
how the same workload is decomposed into tiers or microservices.

```
┌──────────────────────┐
│       Monolith       │  :8080
│  fa-layer-group      │
│  quotes ✓            │
│  products ✓          │
│  counter ✓           │
└──────────────────────┘
```

**Services:**

| Service | Port | Color | QoS | Features |
|---|---|---|---|---|
| Monolith | 8080 | Deep purple | 5 ms + 3 ms jitter | Quotes, Products, Counter |

**What to show:**
- The WebApp overlay (product, quote, Buy button) appears as soon as the page loads.
- Clicking **Buy** increments the counter badge on the node card.
- Because there are no upstreams the topology is a single node — a good starting point for
  introducing the tool.

**Config file:** [`configs/monolith/frontend.yaml`](../configs/monolith/frontend.yaml)

---

## two-tier

**Ports:** 8080 (Frontend), 8081 (Backend)

The simplest distributed topology: a web frontend that calls a single backend service. The backend
owns the counter, quotes, and products. Use this to introduce upstream fan-out, health propagation,
and the QoS parameters.

```
┌──────────┐          ┌──────────────────────┐
│ Frontend │  ──────▶ │       Backend        │
│  :8080   │          │  :8081               │
│ fa-globe │          │  fa-database         │
└──────────┘          │  quotes ✓ products ✓ │
                      │  counter ✓           │
                      └──────────────────────┘
```

**Services:**

| Service | Port | Color | QoS | Features |
|---|---|---|---|---|
| Frontend | 8080 | Green | 0 ms | — |
| Backend | 8081 | Purple | 8 ms + 4 ms jitter | Quotes, Products, Counter |

**What to show:**
- The WebApp overlay appears because the Backend (reachable from Frontend) owns the features.
- Stop the Backend process and watch the Frontend node show a red error label for its upstream.
- The `/health` endpoint of the Frontend will return 503 while the Backend is down.

**Config files:** [`configs/two-tier/`](../configs/two-tier/)

---

## three-tier

**Ports:** 8080 (Frontend), 8081 (AppLogic), 8082 (Backend)

The classic three-tier architecture: web → application logic → data. The AppLogic layer adds
15 ms of base latency (simulating business-logic processing), and the Backend is the data store.

```
┌──────────┐     ┌──────────────┐     ┌──────────────────────┐
│ Frontend │ ──▶ │   AppLogic   │ ──▶ │       Backend        │
│  :8080   │     │  :8081       │     │  :8082               │
│ fa-globe │     │  fa-server   │     │  fa-database         │
└──────────┘     │ 15ms + 8ms ✓ │     │  quotes ✓ products ✓ │
                 └──────────────┘     │  counter ✓           │
                                      └──────────────────────┘
```

**Services:**

| Service | Port | Color | QoS | Features |
|---|---|---|---|---|
| Frontend | 8080 | Green | 0 ms | — |
| AppLogic | 8081 | Blue | 15 ms + 8 ms jitter | — |
| Backend | 8082 | Purple | 5 ms + 2 ms jitter | Quotes, Products, Counter |

**What to show:**
- Hover / inspect the AppLogic node to see the latency values on the card.
- Raise `applogic.yaml`'s `failure_rate` to 0.5 and reload — 50% of requests will fail.
  The Frontend node will show its upstream as errored for those requests.
- The topology has three BFS layers, illustrating how the UI stacks tiers vertically.

**Config files:** [`configs/three-tier/`](../configs/three-tier/)

---

## microservices

**Ports:** 8080–8084

A realistic microservices decomposition. The Frontend calls three parallel leaf services
(Quotes, Products, Payment) concurrently. The Payment service has its own downstream Backend.
This topology demonstrates parallel fan-out and a diamond dependency graph.

```
                    ┌───────────────┐
                    │   Frontend    │  :8080
                    │   fa-globe    │
                    └───────┬───────┘
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌───────────┐    ┌───────────────┐   ┌────────────┐
   │  Quotes   │    │   Products    │   │  Payment   │
   │  :8081    │    │  :8082        │   │  :8083     │
   │ fa-bookmark│   │  fa-box-open  │   │fa-dollar-  │
   │ quotes ✓  │    │  products ✓   │   │   sign     │
   └───────────┘    └───────────────┘   └─────┬──────┘
                                              ▼
                                       ┌────────────┐
                                       │  Backend   │
                                       │  :8084     │
                                       │fa-database │
                                       │counter ✓   │
                                       └────────────┘
```

**Services:**

| Service | Port | Color | QoS | Features |
|---|---|---|---|---|
| Frontend | 8080 | Green | 0 ms | — |
| Quotes | 8081 | Cyan | 10 ms + 5 ms jitter | Quotes |
| Products | 8082 | Amber | 12 ms + 6 ms jitter | Products |
| Payment | 8083 | Red | 20 ms + 10 ms jitter | — |
| Backend | 8084 | Purple | 5 ms + 2 ms jitter | Counter |

**What to show:**
- All three services below Frontend are queried **concurrently** — the total latency seen by
  the user is dominated by the slowest leaf (Payment at up to 30 ms), not the sum.
- Shut down the Quotes service and observe that only the Quotes node turns red — Products and
  Payment continue to serve normally.
- The WebApp overlay displays the product from the Products service, the quote from the Quotes
  service, and the counter from the Backend (via Payment).

**Config files:** [`configs/microservices/`](../configs/microservices/)

---

## replication

**Ports:** 8080–8086

A full replicated topology with a load balancer distributing traffic across two independent replica
stacks. The LoadBalancer uses `round_robin: true` so each request goes to exactly one frontend,
alternating between the two. This scenario demonstrates horizontal scaling, replica tagging, and
round-robin routing.

```
                 ┌───────────────────────┐
                 │     LoadBalancer      │  :8080
                 │  fa-shuffle           │
                 │  round_robin: true    │
                 └───────────┬───────────┘
              ┌──────────────┴──────────────┐
              ▼                             ▼
        ┌──────────┐                 ┌──────────┐
        │Frontend_1│ :8081  [r1]     │Frontend_2│ :8082  [r2]
        └────┬─────┘                 └────┬─────┘
             ▼                            ▼
        ┌──────────┐                 ┌──────────┐
        │AppLogic_1│ :8083  [r1]     │AppLogic_2│ :8084  [r2]
        └────┬─────┘                 └────┬─────┘
             ▼                            ▼
        ┌──────────┐                 ┌──────────┐
        │ Backend_1│ :8085  [r1]     │ Backend_2│ :8086  [r2]
        │ quotes ✓ │                 │ quotes ✓ │
        │products ✓│                 │products ✓│
        │counter ✓ │                 │counter ✓ │
        └──────────┘                 └──────────┘
```

**Services:**

| Service | Port | Tag | Color | QoS |
|---|---|---|---|---|
| LoadBalancer | 8080 | — | Dark blue | 0 ms, round-robin |
| Frontend_1 | 8081 | r1 | Green | 2 ms + 1 ms jitter |
| Frontend_2 | 8082 | r2 | Green | 2 ms + 1 ms jitter |
| AppLogic_1 | 8083 | r1 | Blue | 15 ms + 8 ms jitter |
| AppLogic_2 | 8084 | r2 | Blue | 15 ms + 8 ms jitter |
| Backend_1 | 8085 | r1 | Purple | 5 ms + 2 ms jitter |
| Backend_2 | 8086 | r2 | Purple | 5 ms + 2 ms jitter |

**What to show:**
- Open the LoadBalancer UI (`http://localhost:8080/ui`) and click **Refresh** repeatedly.
  On odd refreshes the graph shows the r1 stack; on even refreshes it shows the r2 stack.
- Shut down one replica stack (e.g. kill the Frontend_1 and AppLogic_1 processes) and
  watch the LoadBalancer's graph alternate between a healthy r2 path and a red r1 error.
- The `r1`/`r2` tags on each node card make it easy to see which replica stack is active
  without reading the port numbers.

**Config files:** [`configs/replication/`](../configs/replication/)

---

## chaos

**Ports:** 8080 (Frontend), 8081 (AppLogic), 8082 (Backend)

> **Purpose:** demonstrate failure propagation, QoS visibility, and health check cascading in a
> single topology. This scenario is designed to be visually dramatic — errors appear in the UI
> immediately without any manual configuration changes.

The AppLogic service is intentionally degraded: it fails 30% of incoming requests (HTTP 500)
and adds 50–70 ms of latency. The Backend is severely slow (200–350 ms), simulating a saturated
database. Because AppLogic sits between Frontend and Backend, its failure rate is clearly visible
in the Frontend's upstream error label.

```
┌──────────┐     ┌───────────────────────────┐     ┌──────────────────────┐
│ Frontend │ ──▶ │         AppLogic          │ ──▶ │       Backend        │
│  :8080   │     │  :8081                    │     │  :8082               │
│ fa-globe │     │  ⚠ failure_rate: 0.3      │     │  fa-database         │
└──────────┘     │  latency 50ms + 20ms ✓   │     │  latency 200ms +150ms│
                 └───────────────────────────┘     │  quotes ✓ products ✓ │
                                                   │  counter ✓           │
                                                   └──────────────────────┘
```

**Services:**

| Service | Port | Color | QoS | Features |
|---|---|---|---|---|
| Frontend | 8080 | Green | 0 ms | — |
| AppLogic | 8081 | Blue | 50 ms + 20 ms jitter, **30% failure** | — |
| Backend | 8082 | Purple | 200 ms + 150 ms jitter | Quotes, Products, Counter |

**What to show:**
- Open `http://localhost:8080/ui`. With the 3-second auto-refresh, you will see the AppLogic
  node alternate between healthy (green dot) and error states.
- The node card shows `fail 30% · err 0%`, making the QoS parameters immediately visible.
- The `/health` endpoint of the Frontend cascades: `curl http://localhost:8080/health` will
  return 503 approximately 30% of the time because its upstream (AppLogic) is degraded.
- Compare the total request time seen by the Frontend against the individual service latencies
  to understand how cascading delays compound.

**Config files:** [`configs/chaos/`](../configs/chaos/)

**Experiment ideas:**

1. **Raise the failure rate** — edit `applogic.yaml`, set `failure_rate: 0.8`. Reload the UI
   and watch most requests fail.
2. **Add error_rate** — set `error_rate: 0.5` on the Frontend so half its calls to AppLogic
   are simulated errors (no network hop, nearly instant).
3. **Fix the backend** — reduce `latency_ms` to 10 in `backend.yaml`, restart just that
   process, and watch the topology recover while AppLogic still fails.

---

## Creating your own scenario

See the [Creating Scenarios](creating-scenarios.md) guide for a step-by-step walkthrough of
building a custom topology from scratch.
