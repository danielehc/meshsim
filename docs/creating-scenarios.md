# Creating Custom Scenarios

A meshsim scenario is nothing more than a folder of YAML files — one per service — plus optional
`quotes.txt` and `products.txt` data files. This guide walks you through building a custom
topology from scratch.

---

## Step 1 — Design your topology

Sketch your services on paper (or a whiteboard) before writing any files. Answer these questions:

1. **How many services?** Each service = one process = one config file.
2. **Which services call which?** Draw directed arrows from caller to callee.
3. **Which service owns the counter, quotes, and products?** Typically a "leaf" (data-tier) service.
4. **Are any services replicated?** If so, plan a load-balancer node with `round_robin: true`.
5. **What QoS do you want to demonstrate?** Assign latency / failure rates now.

> **Rule:** Keep the topology acyclic. meshsim has no cycle detection; a cycle (A → B → A) will
> recurse until the 3-second upstream timeout.

**Example topology — a simple e-commerce checkout flow:**

```
┌────────────┐     ┌───────────────┐     ┌─────────────┐
│  Checkout  │ ──▶ │  Inventory    │ ──▶ │  Database   │
│  :8080     │     │  :8081        │     │  :8082      │
└────────────┘     └───────────────┘     └─────────────┘
       └────────────────────────────────▶ │  Payment   │
                                          │  :8083     │
                                          └────────────┘
```

---

## Step 2 — Create the scenario folder

```sh
mkdir -p configs/my-scenario
```

All paths in YAML files (`quotes_file`, `products_file`) are relative to the **repository root**
(the directory where you run `./meshsim`), so always run meshsim from the repo root.

---

## Step 3 — Write a config file for each service

Create one `.yaml` file per service. The minimum required fields are `name` and `port`:

```yaml
# configs/my-scenario/checkout.yaml
name: "Checkout"
port: 8080
```

A more realistic starting point:

```yaml
# configs/my-scenario/checkout.yaml
name: "Checkout"
color: "#16a34a"          # choose a colour that makes the tier easy to identify
icon: "fa-globe"
port: 8080

upstreams:
  - name: "Inventory"
    address: "localhost"
    port: 8081
  - name: "Payment"
    address: "localhost"
    port: 8083

qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.0

ui_refresh_secs: 5
```

Repeat for every service in your topology. See the [Configuration reference](configuration.md)
for a full list of fields.

---

## Step 4 — Add data files (optional)

If any service uses `quotes_enabled` or `products_enabled`, create the data files.

**`configs/my-scenario/quotes.txt`** — one quote per line:

```
The checkout button is worth a thousand pixels.
Fast is better than slow.
# This line is a comment and will be ignored

Availability is not a feature; it is a contract.
```

**`configs/my-scenario/products.txt`** — `Product Name | fa-icon` per line:

```
# Format: Product Name | fa-icon
Swift Cart | fa-bolt
Vault Pay | fa-lock
Cloud Goods | fa-cloud
```

Then reference the files in your service config:

```yaml
quotes_enabled: true
quotes_file: "configs/my-scenario/quotes.txt"

products_enabled: true
products_file: "configs/my-scenario/products.txt"
```

---

## Step 5 — Choose icons and colours

**Colours** — use hex codes. A suggested palette for tier colouring:

| Tier | Suggested colour | Hex |
|---|---|---|
| Web / frontend | Green | `#347a16` |
| API / app logic | Blue | `#3b82f6` |
| Data / backend | Purple | `#a855f7` |
| Cache | Orange | `#f97316` |
| Auth / security | Yellow | `#ca8a04` |
| Load balancer | Dark blue | `#1d4ed8` |
| External / 3rd party | Red | `#dc2626` |

**Icons** — a quick reference of the most useful ones:

| Icon | Config value | Use for |
|---|---|---|
| Globe | `fa-globe` | Web frontend, public endpoint |
| Server | `fa-server` | API, app logic, middleware |
| Database | `fa-database` | Data store, persistence layer |
| Shuffle | `fa-shuffle` | Load balancer, proxy, router |
| Lock | `fa-lock` | Auth service, identity provider |
| Bolt | `fa-bolt` | Hot path, function, event handler |
| Cloud | `fa-cloud` | Cloud-native service, SaaS dependency |
| Envelope | `fa-envelope` | Message queue, event bus |
| Dharmachakra | `fa-dharmachakra` | Kubernetes sidecar or operator |
| Puzzle piece | `fa-puzzle-piece` | Microservice, plugin |

See the full list in [Icons.md](Icons.md).

---

## Step 6 — Add version tags (optional)

Use tags to annotate nodes with version numbers, replica IDs, or deployment channels:

```yaml
# stable version — bookmark icon, green badge
tag: "stable"
tag_color: "#22c55e"
tag_icon: "fa-bookmark"

# canary version — bolt icon, amber badge
tag: "canary"
tag_color: "#f59e0b"
tag_icon: "fa-bolt"

# replica ID — default circle icon
tag: "r2"
tag_color: "#a3e635"
```

---

## Step 7 — Test locally

Launch all services from the repo root:

```sh
# Launch each service in the background
./meshsim --config configs/my-scenario/checkout.yaml &
./meshsim --config configs/my-scenario/inventory.yaml &
./meshsim --config configs/my-scenario/database.yaml &
./meshsim --config configs/my-scenario/payment.yaml &

# Open the entry point
open http://localhost:8080/ui
```

Or add your scenario to `configs/` and use the interactive launcher:

```sh
./run.sh
```

Your new folder will appear in the scenario menu automatically.

**Verify all upstreams are connected:**

```sh
curl -s http://localhost:8080/health | jq .
# {"status":"ok"}  — all upstreams healthy
```

---

## Step 8 — Tune QoS for your demo

Once the topology works, add realistic QoS parameters to tell a visual story:

```yaml
# Inventory service — slow DB lookup
qos:
  latency_ms: 40
  jitter_ms: 20
  failure_rate: 0.0
  error_rate: 0.0

# Payment service — external call, occasional timeouts
qos:
  latency_ms: 80
  jitter_ms: 50
  failure_rate: 0.05    # 5% chance of failure
  error_rate: 0.0
```

After editing a config, restart only that service (not the whole scenario):

```sh
# Kill the existing Payment process, then relaunch
pkill -f "meshsim.*payment"
./meshsim --config configs/my-scenario/payment.yaml &
```

See the [QoS guide](qos-guide.md) for a deeper look at all simulation parameters.

---

## Complete example — checkout flow

Here is a complete working scenario. Create these five files:

<details>
<summary><code>configs/checkout/checkout.yaml</code></summary>

```yaml
name: "Checkout"
color: "#16a34a"
icon: "fa-globe"
port: 8080
upstreams:
  - name: "Inventory"
    address: "localhost"
    port: 8081
  - name: "Payment"
    address: "localhost"
    port: 8083
qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

</details>

<details>
<summary><code>configs/checkout/inventory.yaml</code></summary>

```yaml
name: "Inventory"
color: "#3b82f6"
icon: "fa-box-open"
port: 8081
upstreams:
  - name: "Database"
    address: "localhost"
    port: 8082
qos:
  latency_ms: 20
  jitter_ms: 10
  failure_rate: 0.0
  error_rate: 0.0
products_enabled: true
products_file: "configs/checkout/products.txt"
ui_refresh_secs: 5
```

</details>

<details>
<summary><code>configs/checkout/database.yaml</code></summary>

```yaml
name: "Database"
color: "#a855f7"
icon: "fa-database"
port: 8082
upstreams: []
qos:
  latency_ms: 10
  jitter_ms: 5
  failure_rate: 0.0
  error_rate: 0.0
counter_enabled: true
ui_refresh_secs: 5
```

</details>

<details>
<summary><code>configs/checkout/payment.yaml</code></summary>

```yaml
name: "Payment"
color: "#ef4444"
icon: "fa-dollar-sign"
port: 8083
upstreams: []
qos:
  latency_ms: 60
  jitter_ms: 40
  failure_rate: 0.05
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/checkout/quotes.txt"
ui_refresh_secs: 5
```

</details>

<details>
<summary><code>configs/checkout/products.txt</code></summary>

```
Swift Cart | fa-bolt
Vault Pay | fa-lock
Cloud Goods | fa-cloud
Nimbus Kit | fa-box
```

</details>

<details>
<summary><code>configs/checkout/quotes.txt</code></summary>

```
Fast checkout drives conversion.
Every millisecond counts at the payment step.
Reliability is the foundation of trust.
```

</details>

**Launch:**

```sh
./meshsim --config configs/checkout/checkout.yaml &
./meshsim --config configs/checkout/inventory.yaml &
./meshsim --config configs/checkout/database.yaml &
./meshsim --config configs/checkout/payment.yaml &
open http://localhost:8080/ui
```

---

## Tips and pitfalls

| Tip | Detail |
|---|---|
| **Run from the repo root** | `quotes_file` and `products_file` paths are relative to the working directory. Always `cd` to the repo root before launching. |
| **Use unique ports** | Each instance must listen on a different port. Collisions cause a startup error. |
| **Avoid cycles** | A → B → A will recurse until timeout. Keep the graph acyclic. |
| **Restart only changed services** | You don't need to stop the whole scenario to change one service's QoS. Kill and relaunch just that process. |
| **Use tags for canary demos** | Assign `tag: "stable"` and `tag: "canary"` to highlight which services are under test. |
| **Leaf nodes have `upstreams: []`** | Explicitly set an empty list on leaf services; it makes the YAML intent clear. |
