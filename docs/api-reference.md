# HTTP API Reference

Each meshsim instance exposes a small HTTP API. These endpoints are used both by the browser UI
and by upstream instances calling their downstream peers.

All requests and responses use JSON unless stated otherwise. All routes are logged to stdout with
a timestamp, method, path, status code, and duration.

**Server timeouts:** read 15 s · write 30 s · idle 60 s · upstream call 3 s.

---

## Endpoints

### `GET /`

The core topology endpoint. Applies QoS (latency + jitter, then failure roll), queries all
configured upstreams concurrently, and returns a recursive `NodeResponse` JSON tree.

**Response (200 OK):**

```json
{
  "name": "Frontend",
  "color": "#347a16",
  "icon": "fa-globe",
  "tag": "",
  "tag_color": "",
  "tag_icon": "",
  "address": "192.168.1.10:8080",
  "qos": {
    "latency_ms": 0,
    "jitter_ms": 0,
    "failure_rate": 0.0,
    "error_rate": 0.0
  },
  "upstreams": [
    {
      "name": "Backend",
      "color": "#a855f7",
      "icon": "fa-database",
      "address": "192.168.1.10:8081",
      "qos": { "latency_ms": 8, "jitter_ms": 4, "failure_rate": 0.0, "error_rate": 0.0 },
      "quote": "Design for failure; everything breaks eventually.",
      "product": "Orbit Relay",
      "product_icon": "fa-shuffle",
      "counter": 7,
      "upstreams": []
    }
  ]
}
```

**Response (500 Internal Server Error) — simulated failure:**

```json
{ "error": "simulated failure", "name": "AppLogic" }
```

**Upstream error node** (embedded in the `upstreams` array when an upstream is unreachable):

```json
{
  "name": "Backend",
  "address": "localhost:8081",
  "error": "dial tcp 127.0.0.1:8081: connect: connection refused",
  "upstreams": []
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `name` | string | Service name |
| `color` | string | Hex banner colour |
| `icon` | string | Font Awesome icon name |
| `tag` | string | Optional version badge label |
| `tag_color` | string | Badge colour |
| `tag_icon` | string | Badge icon |
| `address` | string | `ip:port` of this instance |
| `qos` | object | Current QoS config (latency_ms, jitter_ms, failure_rate, error_rate) |
| `quote` | string | Random quote (only present if `quotes_enabled: true`) |
| `product` | string | Product name (only present if `products_enabled: true`) |
| `product_icon` | string | Product icon (only present if `products_enabled: true`) |
| `counter` | int64 | Counter value (only present if `counter_enabled: true`) |
| `upstreams` | array | Recursive `NodeResponse` for each upstream |
| `error` | string | Error message (only present when this node errored) |

**`curl` example:**

```sh
curl -s http://localhost:8080/ | jq .
```

---

### `GET /ui`

Serves the embedded single-page browser UI. Injects the runtime configuration JSON
(`ui_refresh_secs`) into the page before serving.

**Response:** `text/html`

**Example:**

```sh
open http://localhost:8080/ui
```

---

### `GET /ui/styles.css`

Serves the embedded CSS stylesheet for the UI.

---

### `GET /ui/app.js`

Serves the embedded JavaScript for the UI.

---

### `GET /health`

Health check endpoint. First applies the failure rate roll (→ 503 if it fires), then checks all
configured upstreams concurrently. Returns 503 if any upstream is unhealthy.

**Response (200 OK):**

```json
{ "status": "ok" }
```

**Response (503 Service Unavailable) — simulated failure:**

```json
{
  "status": "degraded",
  "reason": "simulated failure (failure_rate=0.30)"
}
```

**Response (503 Service Unavailable) — upstream unhealthy:**

```json
{
  "status": "degraded",
  "reason": "upstream Backend returned HTTP 503"
}
```

**`curl` examples:**

```sh
# Check a single instance
curl -s http://localhost:8080/health

# Check all instances in a scenario
for port in 8080 8081 8082; do
  echo -n "localhost:$port → "
  curl -s http://localhost:$port/health
  echo
done
```

**Scripted health check (exits non-zero if any service is degraded):**

```sh
#!/usr/bin/env bash
ports=(8080 8081 8082)
all_ok=true
for port in "${ports[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  echo "localhost:$port → HTTP $status"
  [[ "$status" != "200" ]] && all_ok=false
done
$all_ok && echo "All healthy" || { echo "One or more services degraded"; exit 1; }
```

---

### `GET /count/get`

Returns the current counter value for **this instance only**. Never fans out to upstreams.
Returns `0` if `counter_enabled` is `false`.

**Response (200 OK):**

```json
{ "counter": 42 }
```

**`curl` example:**

```sh
curl -s http://localhost:8081/count/get
# {"counter":42}
```

---

### `POST /count/add`

Increments the counter and returns the new value.

- **If this instance has `counter_enabled: true`:** increments the local atomic counter and
  returns it.
- **If this instance does NOT own a counter:** fans out `POST /count/add` to all upstreams
  concurrently and returns the **sum** of their counter values. Failed upstream calls
  contribute 0.

This fan-out means you can call `POST /count/add` on any node in the topology — it will find
its way to the counter owner(s).

**Request:** `POST` with no body.

**Response (200 OK):**

```json
{ "counter": 43 }
```

**`curl` examples:**

```sh
# Increment via the counter-owning service directly
curl -s -X POST http://localhost:8081/count/add

# Increment via the frontend (fans out through the topology)
curl -s -X POST http://localhost:8080/count/add

# Simulate 10 purchases
for i in $(seq 10); do curl -s -X POST http://localhost:8080/count/add; echo; done
```

---

## Full request flow walkthrough

The following shows what happens internally when the UI fetches `GET /` from the Frontend of the
`two-tier` scenario:

```
Browser
  └─▶ GET http://localhost:8080/          (Frontend)
        │  Apply QoS: sleep 0 ms, no failure
        │  Concurrently fan out GET / to upstreams:
        │    └─▶ GET http://localhost:8081/  (Backend)
        │          Apply QoS: sleep 8+rand(4) ms, no failure
        │          No upstreams → build NodeResponse
        │          Return: {name:"Backend", quote:"...", product:"...", counter:7}
        │  Assemble root NodeResponse with Backend in upstreams[]
        └─▶ Return: {name:"Frontend", upstreams:[{name:"Backend", ...}]}
```

---

## Content types

| Endpoint | Content-Type |
|---|---|
| `GET /` | `application/json` |
| `GET /ui` | `text/html; charset=utf-8` |
| `GET /ui/styles.css` | `text/css` |
| `GET /ui/app.js` | `application/javascript` |
| `GET /health` | `application/json` |
| `GET /count/get` | `application/json` |
| `POST /count/add` | `application/json` |

---

## Error responses

| Scenario | HTTP status | Body |
|---|---|---|
| QoS `failure_rate` fired | 500 | `{"error":"simulated failure","name":"..."}` |
| QoS `failure_rate` fired on health | 503 | `{"status":"degraded","reason":"simulated failure ..."}` |
| Upstream health check failed | 503 | `{"status":"degraded","reason":"upstream X returned HTTP ..."}` |
| Embedded UI file missing (should not occur) | 500 | plain text error |

Upstream errors within `GET /` do **not** cause the root request to fail — the erroring upstream
appears as a node with an `"error"` field in the `upstreams` array.
