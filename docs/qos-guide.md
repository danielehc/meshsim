# QoS Simulation Guide

meshsim's Quality-of-Service (QoS) simulation lets you inject artificial latency and failures into
any service node without changing any application code. All QoS parameters are set in the `qos`
block of the YAML config and take effect immediately on the next request after the process starts.

---

## The four QoS parameters

```yaml
qos:
  latency_ms: 50       # fixed delay (ms) added to every incoming request
  jitter_ms: 30        # random extra delay drawn from [0, jitter_ms] ms
  failure_rate: 0.1    # probability this instance returns HTTP 500       [0–1]
  error_rate: 0.0      # probability each outgoing upstream call errors   [0–1]
```

---

## latency\_ms and jitter\_ms — Simulating processing delay

`latency_ms` adds a **fixed sleep** to every incoming request. `jitter_ms` adds a **random
additional sleep** drawn uniformly from `[0, jitter_ms]` ms. Together they model the natural
variation of real service latency:

```
total_sleep = latency_ms + rand(0, jitter_ms)
```

The sleep runs **before** the failure roll and **before** calling any upstreams, so it accurately
models a service that is slow (not broken) but adds delay to every request.

### Visual effect in the UI

The node card always shows the configured values, not the actual per-request delay:

```
latency 50ms · jitter 30ms
```

### Examples

**Healthy but slow database (simulating lock contention):**

```yaml
qos:
  latency_ms: 150
  jitter_ms: 80
```

**Instantaneous (no artificial delay):**

```yaml
qos:
  latency_ms: 0
  jitter_ms: 0
```

**Realistic API gateway (fast, low variance):**

```yaml
qos:
  latency_ms: 5
  jitter_ms: 3
```

**Degraded external payment provider (slow, high variance):**

```yaml
qos:
  latency_ms: 300
  jitter_ms: 200
```

### Latency budgets and cascading delays

Because upstreams are called **after** the local sleep, latency compounds through the topology.
The total round-trip time seen by the top-level caller is approximately:

```
total_rtt ≈ sum of all latency_ms along the critical path
           + worst-case jitter at each hop
           + network round-trips (negligible on localhost)
```

For a three-tier topology with 50 ms frontend + 100 ms applogic + 150 ms backend:

```
total_rtt ≈ 50 + 100 + 150 = 300 ms (before jitter)
```

If the upstreams are called **concurrently** (e.g. a fan-out), the total time is dominated by
the **slowest** upstream, not the sum. This is a key insight for microservices demos.

---

## failure\_rate — Simulating service failures

`failure_rate` is a probability in [0, 1] that an incoming request will return
**HTTP 500 (Internal Server Error)** without calling any upstreams. It is evaluated independently
for every request using a uniform random roll:

```
if rand() < failure_rate → return 500
```

### Effect on health checks

A service with `failure_rate > 0` also applies the same roll on `GET /health`, returning
**HTTP 503** when the roll fires. This causes any upstream caller's health check to cascade
(the caller's `/health` will also return 503).

### Visual effect in the UI

The node card shows the configured rate:

```
fail 30% · err 0%
```

When a failure fires during a UI refresh, the downstream node card shows a red status dot and
an error message: `upstream returned HTTP 500`.

### Examples

**Healthy service (no failures):**

```yaml
qos:
  failure_rate: 0.0
```

**Occasionally flaky service (simulate transient errors):**

```yaml
qos:
  failure_rate: 0.05    # 5% — a realistic "nine-nines" imperfect service
```

**Degraded service (most requests fail):**

```yaml
qos:
  failure_rate: 0.5     # 50% — clearly broken in the UI
```

**Fully broken service:**

```yaml
qos:
  failure_rate: 1.0     # 100% — every request returns 500
```

> **Demo tip:** Start with `failure_rate: 0.0`, then live-edit the YAML and restart the process
> to show the topology degrading in real time. The chaos scenario (`configs/chaos/`) ships with
> `failure_rate: 0.3` on AppLogic to demonstrate this out of the box.

---

## error\_rate — Simulating upstream call errors

`error_rate` is a probability in [0, 1] that **each outgoing call to an upstream** is simulated
as an error — no network connection is made. This is different from `failure_rate`, which affects
the **incoming** request:

| Parameter | Affects | Network call made? |
|---|---|---|
| `failure_rate` | This service's response to its callers | No (returns 500 immediately) |
| `error_rate` | This service's calls to its upstreams | No (upstream is marked as errored) |

`error_rate` is applied **per upstream call, independently**. If a service has three upstreams
and `error_rate: 0.3`, each upstream has a 30% independent chance of appearing as errored.

### Visual effect in the UI

An errored upstream node appears with a red dot and an error message:

```
simulated upstream error (error_rate)
```

### Examples

**Simulate a network partition to one upstream:**

```yaml
qos:
  error_rate: 1.0       # all calls to upstreams are simulated as errors
```

**Simulate intermittent connectivity:**

```yaml
qos:
  error_rate: 0.2       # 20% of upstream calls fail
```

**Combining failure_rate and error_rate:**

```yaml
# AppLogic: sometimes fails itself AND sometimes can't reach Backend
qos:
  failure_rate: 0.1     # 10% chance of returning 500 to its caller
  error_rate: 0.15      # 15% chance of simulating an error calling Backend
```

---

## Combining all parameters

The order of evaluation on each incoming request is:

```
1. Sleep latency_ms + rand(0, jitter_ms)
2. Roll failure_rate → if fires, return HTTP 500 immediately
3. For each upstream:
   a. Roll error_rate → if fires, record error without calling the upstream
   b. Otherwise, make the HTTP call (3s timeout)
4. Assemble and return NodeResponse
```

### Scenario: simulating a database under load

```yaml
# backend.yaml — slow and occasionally failing
qos:
  latency_ms: 200       # 200 ms base latency (slow queries)
  jitter_ms: 150        # up to 350 ms (variable lock wait times)
  failure_rate: 0.05    # 5% chance of returning 500 (deadlock, OOM)
  error_rate: 0.0       # no upstreams to error on
```

### Scenario: simulating a flaky microservice with a bad dependency

```yaml
# payment.yaml — slow, and its upstream (fraud-check) is unreliable
qos:
  latency_ms: 80
  jitter_ms: 40
  failure_rate: 0.0
  error_rate: 0.25      # 25% of calls to fraud-check fail
```

### Scenario: demonstrating graceful degradation

Configure upstream-calling services with moderate `error_rate` and no `failure_rate`. The
service itself stays up and returns partial results (error nodes are included in the JSON but
the response still succeeds with HTTP 200). The UI shows the broken upstreams in red while the
calling service remains green — a vivid illustration of partial failures and graceful degradation.

---

## Changing QoS without restarting the whole scenario

You can change a single service's QoS by editing its YAML and restarting just that process:

```sh
# Edit the config
vim configs/three-tier/applogic.yaml  # set failure_rate: 0.5

# Find and kill only that instance
pkill -f "meshsim.*applogic"

# Restart it
./meshsim --config configs/three-tier/applogic.yaml &
```

The other services continue running. Within one UI refresh cycle the topology will reflect
the new state.

---

## QoS reference table

| Parameter | Type | Range | Default | Effect |
|---|---|---|---|---|
| `latency_ms` | int | ≥ 0 | 0 | Fixed sleep (ms) before processing |
| `jitter_ms` | int | ≥ 0 | 0 | Random extra sleep 0–N ms |
| `failure_rate` | float | 0–1 | 0.0 | Probability of HTTP 500 (also 503 on /health) |
| `error_rate` | float | 0–1 | 0.0 | Probability each outgoing upstream call errors |
