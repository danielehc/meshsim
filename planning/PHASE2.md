# meshsim — Phase 2: Scenarios, run.sh, and Makefile

> **Goal**: all 5 scenario config folders, shared data files, a single `run.sh` launcher,
> and a complete `Makefile`.  Phase 1 must be complete before starting this phase.
>
> **Read first**: `TECH.md` §8 (build & toolchain) and `PROMPT.md` §Scenarios.  
> **Reference**: `../meshsim_old/configs/` for old config examples and data files.

---

## 0. Prerequisites

- Phase 1 complete: `./meshsim --config <file>` works.
- The binary compiles cleanly with `make build`.

---

## 1. Shared data files

Each scenario folder gets its own `quotes.txt` and `products.txt` so scenarios can have
thematic differentiation.  The format is the same as the old app:

- `quotes.txt`: one quote per line; blank lines and `#`-prefixed lines are ignored.
- `products.txt`: `Product Name | fa-icon` per line; same ignore rules.

Copy the files from `../meshsim_old/configs/three-tier-multi/` as a starting point for
all scenarios, then customise as described per scenario below.

---

## 2. Scenario: `configs/monolith/`

**Description**: a single service that hosts everything — quotes, products, and a counter.
Demonstrates what a "fat" monolith looks like in the topology.

### Ports

| Instance | Port |
|----------|------|
| Frontend | 8080 |

### `frontend.yaml`

```yaml
name: "Monolith"
color: "#6b21a8"          # deep purple
icon: "fa-layer-group"
port: 8080
upstreams: []
qos:
  latency_ms: 5
  jitter_ms: 3
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/monolith/quotes.txt"
products_enabled: true
products_file: "configs/monolith/products.txt"
counter_enabled: true
ui_refresh_secs: 5
```

### Data files

Use the standard quotes/products from the reference.  Optionally prefix a comment
`# Monolith scenario` at the top.

---

## 3. Scenario: `configs/two-tier/`

**Description**: Frontend + Backend. Classic two-tier: presentation calls the data layer.

### Ports

| Instance | Port |
|----------|------|
| Frontend | 8080 |
| Backend  | 8081 |

### `frontend.yaml`

```yaml
name: "Frontend"
color: "#347a16"          # green
icon: "fa-globe"
port: 8080
upstreams:
  - name: "Backend"
    address: "localhost"
    port: 8081
qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `backend.yaml`

```yaml
name: "Backend"
color: "#a855f7"          # purple
icon: "fa-database"
port: 8081
upstreams: []
qos:
  latency_ms: 8
  jitter_ms: 4
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/two-tier/quotes.txt"
products_enabled: true
products_file: "configs/two-tier/products.txt"
counter_enabled: true
ui_refresh_secs: 5
```

---

## 4. Scenario: `configs/three-tier/`

**Description**: Frontend → AppLogic → Backend. Standard three-tier architecture.

### Ports

| Instance  | Port |
|-----------|------|
| Frontend  | 8080 |
| AppLogic  | 8081 |
| Backend   | 8082 |

### `frontend.yaml`

```yaml
name: "Frontend"
color: "#347a16"
icon: "fa-globe"
port: 8080
upstreams:
  - name: "AppLogic"
    address: "localhost"
    port: 8081
qos:
  latency_ms: 0
  jitter_ms: 0
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `applogic.yaml`

```yaml
name: "AppLogic"
color: "#3b82f6"          # blue
icon: "fa-server"
port: 8081
upstreams:
  - name: "Backend"
    address: "localhost"
    port: 8082
qos:
  latency_ms: 15
  jitter_ms: 8
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `backend.yaml`

```yaml
name: "Backend"
color: "#a855f7"
icon: "fa-database"
port: 8082
upstreams: []
qos:
  latency_ms: 5
  jitter_ms: 2
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/three-tier/quotes.txt"
products_enabled: true
products_file: "configs/three-tier/products.txt"
counter_enabled: true
ui_refresh_secs: 5
```

---

## 5. Scenario: `configs/microservices/`

**Description**: Frontend → Quotes + Products + Payment → Backend (for Payment only).
Demonstrates a microservices topology where each service has a single responsibility.

Architecture:
```
                   ┌───────────┐
                   │  Frontend │ :8080
                   └─────┬─────┘
         ┌────────────────┼──────────────┐
         ▼                ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │  Quotes  │   │ Products │   │ Payment  │ :8083
   │  :8081   │   │  :8082   │   └────┬─────┘
   └──────────┘   └──────────┘        ▼
                                ┌──────────┐
                                │ Backend  │ :8084
                                └──────────┘
```

### Ports

| Instance | Port |
|----------|------|
| Frontend | 8080 |
| Quotes   | 8081 |
| Products | 8082 |
| Payment  | 8083 |
| Backend  | 8084 |

### `frontend.yaml`

```yaml
name: "Frontend"
color: "#347a16"
icon: "fa-globe"
port: 8080
upstreams:
  - name: "Quotes"
    address: "localhost"
    port: 8081
  - name: "Products"
    address: "localhost"
    port: 8082
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

### `quotes.yaml`

```yaml
name: "Quotes"
color: "#0891b2"          # cyan
icon: "fa-bookmark"
port: 8081
upstreams: []
qos:
  latency_ms: 10
  jitter_ms: 5
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/microservices/quotes.txt"
ui_refresh_secs: 5
```

### `products.yaml`

```yaml
name: "Products"
color: "#f59e0b"          # amber
icon: "fa-box-open"
port: 8082
upstreams: []
qos:
  latency_ms: 12
  jitter_ms: 6
  failure_rate: 0.0
  error_rate: 0.0
products_enabled: true
products_file: "configs/microservices/products.txt"
ui_refresh_secs: 5
```

### `payment.yaml`

```yaml
name: "Payment"
color: "#ef4444"          # red
icon: "fa-dollar-sign"
port: 8083
upstreams:
  - name: "Backend"
    address: "localhost"
    port: 8084
qos:
  latency_ms: 20
  jitter_ms: 10
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `backend.yaml`

```yaml
name: "Backend"
color: "#a855f7"
icon: "fa-database"
port: 8084
upstreams: []
qos:
  latency_ms: 5
  jitter_ms: 2
  failure_rate: 0.0
  error_rate: 0.0
counter_enabled: true
ui_refresh_secs: 5
```

### Data files

- `quotes.txt`: copy from reference, add `# Microservices — Quotes service` header.
- `products.txt`: copy from reference, add `# Microservices — Products service` header.

---

## 6. Scenario: `configs/replication/`

**Description**: LoadBalancer → 2×Frontend → 2×AppLogic → 2×Backend.
Demonstrates horizontal replication and real round-robin load distribution.

Architecture:
```
           ┌─────────────────┐
           │  LoadBalancer   │ :8080  round_robin: true
           └────────┬────────┘
         ┌──────────┴──────────┐
         ▼                     ▼
   ┌──────────┐          ┌──────────┐
   │Frontend_1│ :8081    │Frontend_2│ :8082
   └─────┬────┘          └────┬─────┘
         ▼                     ▼
   ┌──────────┐          ┌──────────┐
   │AppLogic_1│ :8083    │AppLogic_2│ :8084
   └─────┬────┘          └────┬─────┘
         ▼                     ▼
   ┌──────────┐          ┌──────────┐
   │ Backend_1│ :8085    │ Backend_2│ :8086
   └──────────┘          └──────────┘
```

### Ports

| Instance     | Port |
|--------------|------|
| LoadBalancer | 8080 |
| Frontend_1   | 8081 |
| Frontend_2   | 8082 |
| AppLogic_1   | 8083 |
| AppLogic_2   | 8084 |
| Backend_1    | 8085 |
| Backend_2    | 8086 |

### `loadbalancer.yaml`

```yaml
name: "LoadBalancer"
color: "#1d4ed8"          # dark blue
icon: "fa-shuffle"
port: 8080
round_robin: true         # NEW — only calls one frontend per request, alternating
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
ui_refresh_secs: 3
```

### `frontend_1.yaml`

```yaml
name: "Frontend_1"
color: "#347a16"
icon: "fa-globe"
tag: "r1"
tag_color: "#4ade80"
port: 8081
upstreams:
  - name: "AppLogic_1"
    address: "localhost"
    port: 8083
qos:
  latency_ms: 2
  jitter_ms: 1
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `frontend_2.yaml`

```yaml
name: "Frontend_2"
color: "#347a16"
icon: "fa-globe"
tag: "r2"
tag_color: "#4ade80"
port: 8082
upstreams:
  - name: "AppLogic_2"
    address: "localhost"
    port: 8084
qos:
  latency_ms: 2
  jitter_ms: 1
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `applogic_1.yaml`

```yaml
name: "AppLogic_1"
color: "#3b82f6"
icon: "fa-server"
tag: "r1"
tag_color: "#60a5fa"
port: 8083
upstreams:
  - name: "Backend_1"
    address: "localhost"
    port: 8085
qos:
  latency_ms: 15
  jitter_ms: 8
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `applogic_2.yaml`

```yaml
name: "AppLogic_2"
color: "#3b82f6"
icon: "fa-server"
tag: "r2"
tag_color: "#60a5fa"
port: 8084
upstreams:
  - name: "Backend_2"
    address: "localhost"
    port: 8086
qos:
  latency_ms: 15
  jitter_ms: 8
  failure_rate: 0.0
  error_rate: 0.0
ui_refresh_secs: 5
```

### `backend_1.yaml`

```yaml
name: "Backend_1"
color: "#a855f7"
icon: "fa-database"
tag: "r1"
tag_color: "#c084fc"
port: 8085
upstreams: []
qos:
  latency_ms: 5
  jitter_ms: 2
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/replication/quotes.txt"
products_enabled: true
products_file: "configs/replication/products.txt"
counter_enabled: true
ui_refresh_secs: 5
```

### `backend_2.yaml`

```yaml
name: "Backend_2"
color: "#a855f7"
icon: "fa-database"
tag: "r2"
tag_color: "#c084fc"
port: 8086
upstreams: []
qos:
  latency_ms: 5
  jitter_ms: 2
  failure_rate: 0.0
  error_rate: 0.0
quotes_enabled: true
quotes_file: "configs/replication/quotes.txt"
products_enabled: true
products_file: "configs/replication/products.txt"
counter_enabled: true
ui_refresh_secs: 5
```

### Data files

Copy from reference.  Both backends share the same `quotes.txt`/`products.txt`
within the replication folder.

---

## 7. `run.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BINARY="./meshsim"
CONFIGS_DIR="./configs"

# ── 1. Build if binary is missing or stale ────────────────────────────────────
needs_build() {
  [[ ! -f "$BINARY" ]] && return 0
  while IFS= read -r -d '' f; do
    [[ "$f" -nt "$BINARY" ]] && return 0
  done < <(find . -name "*.go" -print0 2>/dev/null)
  return 1
}

if needs_build; then
  echo "Building meshsim..."
  make build
fi

# ── 2. Scenario menu ──────────────────────────────────────────────────────────
mapfile -t scenarios < <(find "$CONFIGS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#scenarios[@]} -eq 0 ]]; then
  echo "No scenario folders found in $CONFIGS_DIR" >&2
  exit 1
fi

echo ""
echo "Available scenarios:"
for i in "${!scenarios[@]}"; do
  printf "  %d) %s\n" $((i+1)) "$(basename "${scenarios[$i]}")"
done
echo ""
read -rp "Select scenario [1]: " choice
choice="${choice:-1}"
scenario="${scenarios[$((choice-1))]}"
echo "Running scenario: $(basename "$scenario")"
echo ""

# ── 3. Launch all *.yaml files in the chosen folder ───────────────────────────
pids=()
mapfile -t configs < <(find "$scenario" -maxdepth 1 -name "*.yaml" | sort)

if [[ ${#configs[@]} -eq 0 ]]; then
  echo "No *.yaml files found in $scenario" >&2
  exit 1
fi

for cfg in "${configs[@]}"; do
  $BINARY --config "$cfg" &
  pids+=($!)
done

# ── 4. Print /ui URLs ──────────────────────────────────────────────────────────
sleep 0.3   # give instances a moment to start
echo ""
echo "Instances running:"
for cfg in "${configs[@]}"; do
  port=$(grep -E '^\s*port\s*:' "$cfg" | head -1 | grep -oE '[0-9]+' | head -1)
  name=$(grep -E '^\s*name\s*:' "$cfg" | head -1 | sed 's/.*: *//; s/"//g')
  printf "  %-20s http://localhost:%s/ui\n" "$name" "${port:-8080}"
done
echo ""
echo "Press Ctrl+C to stop all instances."
echo ""

# ── 5. Cleanup on Ctrl+C ─────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping all instances..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait "${pids[@]}" 2>/dev/null || true
  echo "Stopped."
}
trap cleanup INT TERM

wait
```

Make it executable: `chmod +x run.sh`.

---

## 8. `Makefile`

```makefile
# meshsim Makefile

BINARY  := meshsim
CMD     := ./cmd/meshsim
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X main.Version=$(VERSION)

.PHONY: build run fmt vet check dist clean help

## build: compile the binary (default)
build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) $(CMD)

## run: launch the scenario menu
run: build
	./run.sh

## fmt: format all Go source files
fmt:
	gofmt -w ./...

## vet: run go vet
vet:
	go vet ./...

## check: fmt + vet
check: fmt vet

## dist: cross-compile for all platforms into dist/
dist:
	mkdir -p dist
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-amd64    $(CMD)
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-arm64    $(CMD)
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-amd64   $(CMD)
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-arm64   $(CMD)
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-windows-amd64.exe $(CMD)

## clean: remove built binary and dist/
clean:
	rm -f $(BINARY)
	rm -rf dist/

## help: print this help message
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## //'

.DEFAULT_GOAL := build
```

---

## 9. Acceptance criteria for Phase 2

For each scenario, run it end-to-end:

```sh
./run.sh
# Select scenario N
```

Verify:
1. All instances start without error.
2. `curl localhost:8080/` returns valid JSON with the correct `name` and `upstreams`.
3. `curl localhost:8080/ui` returns HTML (placeholder from Phase 1 is fine).
4. Each additional instance responds on its port.
5. Ctrl+C stops all processes cleanly (no orphaned processes).

**Replication scenario**: verify round-robin by running:
```sh
curl -s localhost:8080/ | python3 -m json.tool | grep '"name"'
```
multiple times — the upstream name should alternate between `Frontend_1` and `Frontend_2`.

---

## 10. Notes

- The `run.sh` port-extraction from YAML is a simple grep — it assumes `port:` is on
  its own line.  This is true for all our config files.
- The `needs_build` function in `run.sh` uses file modification time comparison.
  It works correctly on macOS and Linux.
- The `mapfile` bash built-in requires bash 4+.  macOS ships bash 3 by default; users
  may need to install bash via Homebrew.  Alternatively, rewrite using a `while read`
  loop if maximum portability is needed.  Add a comment in the script about this.
- All config file paths (`quotes_file`, `products_file`) are relative to the **working
  directory where the binary is launched** (i.e., the repo root when using `run.sh`).
  This matches the old app's behaviour.
