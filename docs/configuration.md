# Configuration Reference

Each meshsim instance is configured by a single YAML file. Run as many instances as your scenario
requires, one config per instance. All config files for a scenario live in a folder under `configs/`.

```sh
./meshsim --config configs/my-scenario/my-service.yaml
```

---

## Full schema

```yaml
# ── Identity ──────────────────────────────────────────────────────────────────
name: "My Service"          # (required) display name on the node card
color: "#3b82f6"            # hex banner colour (default: blue)
icon: "fa-server"           # Font Awesome icon name (see Icons reference)

# ── Version / release badge ───────────────────────────────────────────────────
tag: "v2"                   # short label shown as a badge on the card (optional)
tag_color: "#4ade80"        # badge background colour (defaults to node color)
tag_icon: "fa-bookmark"     # badge icon (see Icons reference)

# ── Network ───────────────────────────────────────────────────────────────────
port: 8080                  # listening port (1–65535, default: 8080)

upstreams:                  # peer services this instance calls on GET /
  - name: "Backend"         # display name used in error messages
    address: "localhost"    # hostname or IP (default: localhost)
    port: 8081

# ── Quality-of-service simulation ─────────────────────────────────────────────
qos:
  latency_ms: 20            # fixed delay (ms) added to every request
  jitter_ms: 10             # random extra delay drawn from [0, jitter_ms] ms
  failure_rate: 0.05        # probability this instance returns HTTP 500  [0–1]
  error_rate: 0.0           # probability an outgoing upstream call is     [0–1]
                            # simulated as failed without a network call

# ── Application features ──────────────────────────────────────────────────────
quotes_enabled: false       # include a random quote in GET / responses
quotes_file: ""             # path to quotes.txt (required when quotes_enabled)

products_enabled: false     # include a random product in GET / responses
products_file: ""           # path to products.txt (required when products_enabled)

counter_enabled: false      # own an in-memory atomic counter
                            # POST /count/add increments it; GET /count/get reads it

round_robin: false          # call only ONE upstream per request, cycling in order
                            # (useful for simulating a load balancer)

# ── UI ─────────────────────────────────────────────────────────────────────────
ui_refresh_secs: 5          # auto-refresh interval for the browser UI (seconds)
```

---

## Field reference

### Identity

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | **required** | The display name shown on the node card in the UI. Must not be empty. |
| `color` | string | `#3b82f6` | Hex colour of the banner strip at the top of the node card. Use it to colour-code tiers or services. |
| `icon` | string | `fa-gear` | Font Awesome icon name. The `fa-` prefix is optional. Unknown names fall back to `fa-gear`. See the [Icons reference](Icons.md). |

### Tag badge

The tag is a small label overlaid on the bottom-right corner of the node card. Use it to show a
version, replica ID, canary/stable channel, or any short annotation.

| Field | Type | Default | Description |
|---|---|---|---|
| `tag` | string | — | Short label text, e.g. `v2`, `r1`, `canary`. |
| `tag_color` | string | node `color` | Background colour of the badge. |
| `tag_icon` | string | `fa-circle` | Icon inside the badge. |

**Example — canary deployment badge:**

```yaml
tag: "canary"
tag_color: "#f59e0b"
tag_icon: "fa-bolt"
```

### Network

| Field | Type | Default | Description |
|---|---|---|---|
| `port` | int | `8080` | The TCP port this instance listens on. Must be unique per machine. Valid range: 1–65535. |
| `upstreams[]` | list | — | Peer services this instance will call on `GET /`. |
| `upstreams[].name` | string | **required** | Display name, used in error messages when the upstream is unreachable. |
| `upstreams[].address` | string | `localhost` | Hostname or IP address of the upstream. When running in Docker use the container name. |
| `upstreams[].port` | int | **required** | Port of the upstream service. |
| `round_robin` | bool | `false` | When `true`, each incoming request calls exactly one upstream in a round-robin order instead of all upstreams concurrently. Use this to model a load balancer. |

> **Important:** meshsim has no cycle detection. If service A lists B as an upstream and B lists A,
> `GET /` will recurse until it hits the 3-second upstream timeout. Keep your topology acyclic.

**Upstream call behaviour:**

- All upstreams are called **concurrently** (unless `round_robin: true`).
- Each outgoing call has a **3-second timeout**.
- An unreachable or erroring upstream appears in the topology graph with a red error label; it does **not** abort the whole request.

### Quality-of-Service simulation

The `qos` block lets you inject artificial delays and failures into a service without touching any
other code. This makes it easy to demonstrate how problems propagate through a topology.

| Field | Type | Default | Description |
|---|---|---|---|
| `qos.latency_ms` | int | `0` | Fixed delay (milliseconds) added to every incoming request **before** calling upstreams. |
| `qos.jitter_ms` | int | `0` | Additional random delay drawn uniformly from `[0, jitter_ms]` ms, added on top of `latency_ms`. |
| `qos.failure_rate` | float | `0.0` | Probability (0–1) that this instance returns HTTP 500 for an incoming request. Also causes `GET /health` to return 503. |
| `qos.error_rate` | float | `0.0` | Probability (0–1) that **each outgoing upstream call** is simulated as failed — no network call is made. The upstream appears as errored in the topology graph. |

**How latency is applied:**

```
total_delay = latency_ms + rand(0, jitter_ms)
```

The delay is applied first; then the failure roll is evaluated. If the failure fires the request
returns HTTP 500 immediately without calling upstreams.

**Example — service with realistic latency and occasional failures:**

```yaml
qos:
  latency_ms: 50
  jitter_ms: 30
  failure_rate: 0.1    # 10% of requests return HTTP 500
  error_rate: 0.0
```

**Example — upstream call errors (simulate a flaky dependency):**

```yaml
qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.2      # 20% of calls to each upstream appear as errors
```

### Application features

These features add visible content to the topology diagram and power the **WebApp overlay** in the
browser UI (the fake shop window with a Buy button).

| Field | Type | Default | Description |
|---|---|---|---|
| `quotes_enabled` | bool | `false` | Include a random quote from `quotes_file` in every `GET /` response. The quote appears in the WebApp overlay. |
| `quotes_file` | string | — | Path to a `quotes.txt` file. Required when `quotes_enabled` is `true`. Paths are relative to the **repository root** (the directory you run `meshsim` from). |
| `products_enabled` | bool | `false` | Include a random product from `products_file` in every `GET /` response. The product name and icon appear in the WebApp overlay. |
| `products_file` | string | — | Path to a `products.txt` file. Required when `products_enabled` is `true`. |
| `counter_enabled` | bool | `false` | This instance owns an in-memory atomic counter. `POST /count/add` increments it; `GET /count/get` reads it. The counter value appears as a badge on the node card. |

> **WebApp overlay:** The overlay panel (simulated shop window) appears automatically in the browser
> UI whenever the topology contains at least one node with quotes, products, or a counter.

**Data file formats:**

`quotes.txt` — one quote per line. Blank lines and lines starting with `#` are ignored.

```
The simplest architecture is no architecture.
# This is a comment
Complexity is the enemy of reliability.
```

`products.txt` — one product per line in the format `Product Name | fa-icon`:

```
Orbit Relay | fa-shuffle
Quantum Cache | fa-bolt
# storage products
Nebula Store | fa-database
```

### UI

| Field | Type | Default | Description |
|---|---|---|---|
| `ui_refresh_secs` | int | `5` | How often the browser UI automatically re-fetches `GET /` and re-renders the topology. Set to a higher value for calmer demos; lower for watching counters increment in near-real-time. |

---

## Validation rules

meshsim validates the config at startup and exits with a descriptive error if any rule is violated:

| Rule | Error |
|---|---|
| `name` must not be empty | `config: name is required` |
| `port` must be in [1, 65535] | `config: port N is out of range [1, 65535]` |
| `qos.failure_rate` must be in [0, 1] | `config: qos.failure_rate must be in [0, 1]` |
| `qos.error_rate` must be in [0, 1] | `config: qos.error_rate must be in [0, 1]` |
| `quotes_file` must exist when `quotes_enabled: true` | `config: quotes_file "path": …` |
| `products_file` must exist when `products_enabled: true` | `config: products_file "path": …` |
| Config file extension must be `.yaml` or `.yml` | `HCL config format is not supported; use YAML` |

---

## Annotated example — three-tier service

```yaml
# configs/three-tier/applogic.yaml

name: "AppLogic"
color: "#3b82f6"          # blue — middle tier
icon: "fa-server"
port: 8081

upstreams:
  - name: "Backend"
    address: "localhost"
    port: 8082

qos:
  latency_ms: 15          # 15 ms base latency (simulates DB query prep)
  jitter_ms: 8            # up to 23 ms total
  failure_rate: 0.0       # never fails on its own
  error_rate: 0.0

ui_refresh_secs: 5
```

---

## Annotated example — load balancer with round-robin

```yaml
# configs/replication/loadbalancer.yaml

name: "LoadBalancer"
color: "#1d4ed8"
icon: "fa-shuffle"
port: 8080
round_robin: true         # sends each request to ONE frontend, alternating

upstreams:
  - name: "Frontend_1"
    address: "localhost"
    port: 8081
  - name: "Frontend_2"
    address: "localhost"
    port: 8082

qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.0

ui_refresh_secs: 3        # faster refresh to watch round-robin in action
```

---

## Annotated example — backend with all features enabled

```yaml
# configs/replication/backend_1.yaml

name: "Backend_1"
color: "#a855f7"          # purple — data tier
icon: "fa-database"
tag: "r1"                 # replica 1 badge
tag_color: "#c084fc"
port: 8085
upstreams: []             # leaf node — no upstreams

qos:
  latency_ms: 5
  jitter_ms: 2
  failure_rate: 0.0
  error_rate: 0.0

quotes_enabled: true
quotes_file: "configs/replication/quotes.txt"

products_enabled: true
products_file: "configs/replication/products.txt"

counter_enabled: true     # owns the Buy counter

ui_refresh_secs: 5
```
