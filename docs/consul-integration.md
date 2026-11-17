# Consul & Service Mesh Integration

meshsim is designed to be a **lightweight, observable workload** — a cluster of HTTP services
that call each other, expose health endpoints, and produce predictable traffic patterns. This
makes it an ideal companion for demonstrating and testing Consul service mesh features without
needing a full application stack.

This guide describes which meshsim features map naturally to Consul capabilities and how to
configure scenarios to highlight them.

---

## Why meshsim works well with Consul

| meshsim feature | Consul capability exercised |
|---|---|
| `GET /health` on every instance | Service health checks (HTTP check) |
| `upstreams[]` calls via HTTP | Service-to-service traffic routed through Envoy sidecars |
| `qos.failure_rate` / `latency_ms` | Chaos engineering, circuit breakers, retries |
| `round_robin: true` load balancer | Load balancing policies, weighted routing |
| Version `tag` on nodes | Traffic splitting (canary / blue-green deployments) |
| Multi-instance replication scenario | Service catalog, deregistration on failure |
| Counter fan-out via `POST /count/add` | End-to-end distributed tracing across sidecars |

---

## Service registration and health checks

Each meshsim instance exposes `GET /health` returning `{"status":"ok"}` (HTTP 200) or
`{"status":"degraded"}` (HTTP 503). Register instances as Consul services with an HTTP health
check:

```hcl
# consul-services/frontend.hcl
service {
  name = "frontend"
  port = 8080
  tags = ["meshsim", "frontend"]

  check {
    name     = "meshsim frontend health"
    http     = "http://localhost:8080/health"
    interval = "5s"
    timeout  = "3s"
  }
}
```

```sh
consul services register consul-services/frontend.hcl
```

When you trigger a failure (`failure_rate: 1.0`), Consul marks the service as `critical`
within one check interval — demonstrating automatic deregistration and traffic rerouting.

---

## Service discovery (replacing hardcoded upstreams)

By default meshsim uses hardcoded `address: localhost` in upstreams. To use Consul service
discovery instead, point upstreams at Consul's DNS interface:

```yaml
# Instead of:
upstreams:
  - name: "Backend"
    address: "localhost"
    port: 8081

# Use Consul DNS (default port 8600, or via dnsmasq on 53):
upstreams:
  - name: "Backend"
    address: "backend.service.consul"
    port: 8081
```

Now Consul resolves `backend.service.consul` to the healthy instance's address, automatically
excluding degraded instances.

---

## Connect (Envoy sidecar) traffic

When running with Consul Connect, replace direct upstream addresses with the **local Connect
proxy port** that Consul injects for each upstream:

```yaml
upstreams:
  - name: "Backend"
    address: "127.0.0.1"
    port: 21001        # Consul Connect proxy listener for 'backend'
```

All traffic between meshsim instances flows through the Envoy sidecars, enabling:

- **mTLS** between services (zero-trust networking)
- **Access control** via intentions
- **Observability** — distributed traces, metrics, and access logs from Envoy

---

## Traffic splitting — canary deployments

The `replication` scenario ships with two stacks tagged `r1` and `r2`. Adapt it for a
canary deployment by registering both backend versions in Consul and creating a service
splitter:

```hcl
# Split 90% to stable (Backend_1) and 10% to canary (Backend_2)
Kind = "service-splitter"
Name = "backend"
Splits = [
  { Weight = 90, ServiceSubset = "stable" },
  { Weight = 10, ServiceSubset = "canary" },
]
```

```hcl
Kind    = "service-resolver"
Name    = "backend"
Subsets = {
  stable = { Filter = "Service.Tags contains \"r1\"" }
  canary = { Filter = "Service.Tags contains \"r2\"" }
}
```

Point meshsim's load balancer upstream at `backend.service.consul` and watch the topology
UI: on 10% of requests the r2 node card will light up, illustrating the weighted split.

> **Tip:** Set `ui_refresh_secs: 1` on the load balancer to make the split visible in rapid
> succession during a live demo.

---

## Circuit breaking and retries

Configure meshsim's AppLogic service with a moderate `failure_rate` (e.g. 0.3), then apply
Consul service defaults to add a circuit breaker:

```hcl
Kind    = "service-defaults"
Name    = "applogic"
UpstreamConfig {
  Defaults {
    Limits {
      MaxConnections        = 100
      MaxPendingRequests    = 50
      MaxConcurrentRequests = 50
    }
    PassiveHealthCheck {
      Interval    = "10s"
      MaxFailures = 3
    }
  }
}
```

With the meshsim chaos scenario running and 30% failures on AppLogic, the circuit will open
after three consecutive failures within the window. The UI shows the AppLogic node erroring,
while Consul's dashboard shows the circuit breaker triggered.

---

## Observability: distributed tracing

meshsim propagates HTTP requests through the topology via plain HTTP calls. When Envoy sidecars
are in the path, they automatically generate and propagate **trace IDs** (B3 / W3C Trace Context
headers). Connect to Zipkin, Jaeger, or the Consul built-in trace storage to see:

- End-to-end request latency across all hops
- Which hop introduced the most latency (compare with meshsim's `latency_ms` values)
- Failed spans when `failure_rate` fires

**Recommended scenario for tracing demos:** `three-tier` or `microservices` — the fan-out
to multiple parallel services is especially clear in a trace waterfall view.

---

## Load balancing policies

Consul supports multiple load balancing policies on its DNS and xDS API. Use the `replication`
scenario to demonstrate them:

| Consul policy | meshsim configuration | What to show |
|---|---|---|
| Round-robin (default) | `round_robin: true` on LoadBalancer | Traffic alternates between r1 and r2 |
| Least connections | Consul service resolver | Consul routes to the replica with fewer active connections |
| Random | Consul service resolver | Each request goes to a random healthy replica |

---

## Suggested demo flows

### Flow 1: Health check and auto-deregistration

1. Start the `two-tier` scenario.
2. Register both services in Consul with HTTP health checks.
3. Confirm both are healthy in the Consul UI.
4. Set `failure_rate: 1.0` on the Backend and restart it.
5. Watch Consul mark Backend as `critical` and remove it from DNS within 5 seconds.
6. Watch the Frontend's topology UI show a red Backend node.

### Flow 2: Canary deployment with traffic splitting

1. Start the `replication` scenario.
2. Register all services in Consul with appropriate tags (`r1`, `r2`).
3. Apply a 90/10 service splitter config.
4. Open the LoadBalancer UI with `ui_refresh_secs: 1`.
5. Click Refresh repeatedly — the Backend node alternates between r1 and r2 approximately
   10% of the time for r2.

### Flow 3: Latency visibility through the mesh

1. Start the `microservices` scenario.
2. Connect all services via Consul Connect (Envoy sidecars).
3. Set `latency_ms: 100` on the Payment service.
4. Open Consul's service mesh topology in the Consul UI alongside the meshsim UI.
5. Show how the latency appears both in meshsim node cards and in Envoy's metrics/traces.

---

## Quick reference: meshsim → Consul feature mapping

| meshsim | Consul equivalent |
|---|---|
| `GET /health` → 200/503 | HTTP service health check |
| `upstreams[]` | Upstream service dependencies (intentions) |
| `round_robin: true` | Load balancing / traffic policy |
| `failure_rate` | Chaos to trigger circuit breakers |
| `latency_ms` | Latency injection to test timeouts / retries |
| `error_rate` | Upstream error simulation (partition, intention deny) |
| `tag` (r1/r2) | Service subsets for traffic splitting |
| Counter via `POST /count/add` | End-to-end traced transaction |
