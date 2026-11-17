# meshsim — Phase 1: Go Backend Core

> **Goal**: a fully working Go binary that compiles, passes `go vet`, and correctly
> serves the HTTP API for any valid YAML config.  No UI yet (the `/ui` endpoint
> can return a placeholder "UI coming in Phase 3").  No scenario configs yet (Phase 2).
>
> **Read first**: `TECH.md` for the full architecture; then implement this phase.  
> **Reference**: `../meshsim_old/src/` for the old implementation to compare against.

---

## 0. Prerequisites

- Go 1.22 installed.
- Working directory: `meshsim/` (this folder).
- External dependency: `gopkg.in/yaml.v3` (add via `go get`).

---

## 1. Initialise the module

```
go mod init meshsim
go get gopkg.in/yaml.v3
```

Expected `go.mod`:

```
module meshsim

go 1.22

require gopkg.in/yaml.v3 v3.0.1
```

---

## 2. Files to create

Create all files listed below.  Implement them in this order (each builds on the previous):

```
cmd/meshsim/main.go
internal/config/config.go
internal/store/quotes.go
internal/store/products.go
internal/counter/counter.go
internal/qos/qos.go
internal/upstream/upstream.go
internal/server/handlers.go
internal/server/server.go
ui/index.html              ← placeholder only in this phase
```

---

## 3. `cmd/meshsim/main.go`

Responsibilities:
1. Parse CLI flags (`--config`, `--quotes-file`, `--products-file`, `--counter`).
2. Load config via `config.Load()`.
3. Apply CLI flag overrides to config.
4. Validate config via `config.Validate()` — fatal on error.
5. Detect local IP (`localIP()` function in this file).
6. Load `QuoteStore` if `cfg.QuotesEnabled && cfg.QuotesFile != ""`.
7. Load `ProductStore` if `cfg.ProductsEnabled && cfg.ProductsFile != ""`.
8. Build `server.App`, call `server.NewServer(app)`.
9. Start serving in a goroutine.
10. Block on `SIGINT`/`SIGTERM`, graceful shutdown with 5s timeout.

```go
package main

import (
    "context"
    "flag"
    "log"
    "meshsim/internal/config"
    "meshsim/internal/counter"
    "meshsim/internal/server"
    "meshsim/internal/store"
    "net"
    "net/http"
    "os"
    "os/signal"
    "strings"
    "syscall"
    "time"
)

// Version is set via ldflags: -X main.Version=<git describe>
var Version = "dev"

func main() { /* ... */ }

func localIP() string {
    conn, err := net.Dial("udp", "8.8.8.8:80")
    if err != nil { return "" }
    defer conn.Close()
    addr, ok := conn.LocalAddr().(*net.UDPAddr)
    if !ok { return "" }
    return addr.IP.String()
}
```

Log lines on startup (same format as old app):
```
[meshsim] Starting instance "Frontend" on port 8080 (color: #347a16)
[meshsim]   upstream: Backend @ localhost:8081
[meshsim] Loaded 34 quotes from configs/monolith/quotes.txt
```

---

## 4. `internal/config/config.go`

### Types

```go
package config

type UpstreamConfig struct {
    Name    string `yaml:"name"`
    Address string `yaml:"address"`
    Port    int    `yaml:"port"`
}

type QoSConfig struct {
    LatencyMs   int     `yaml:"latency_ms"   json:"latency_ms"`
    JitterMs    int     `yaml:"jitter_ms"    json:"jitter_ms"`
    FailureRate float64 `yaml:"failure_rate" json:"failure_rate"`
    ErrorRate   float64 `yaml:"error_rate"   json:"error_rate"`
}

type Config struct {
    Name            string           `yaml:"name"`
    Color           string           `yaml:"color"`
    Icon            string           `yaml:"icon"`
    Tag             string           `yaml:"tag"`
    TagColor        string           `yaml:"tag_color"`
    TagIcon         string           `yaml:"tag_icon"`
    Port            int              `yaml:"port"`
    Upstreams       []UpstreamConfig `yaml:"upstreams"`
    QoS             QoSConfig        `yaml:"qos"`
    QuotesEnabled   bool             `yaml:"quotes_enabled"`
    QuotesFile      string           `yaml:"quotes_file"`
    ProductsEnabled bool             `yaml:"products_enabled"`
    ProductsFile    string           `yaml:"products_file"`
    CounterEnabled  bool             `yaml:"counter_enabled"`
    UIRefreshSecs   int              `yaml:"ui_refresh_secs"`
    RoundRobin      bool             `yaml:"round_robin"`   // NEW
}
```

### `Load(path string) (*Config, error)`

- Reject `.hcl` extension with `fmt.Errorf("HCL config format is not supported; use YAML")`.
- Read file, unmarshal YAML.
- Apply defaults:
  - `Port` → 8080 if 0
  - `Color` → `"#3b82f6"` if empty
  - `Icon` → `"fa-gear"` if empty
  - `UIRefreshSecs` → 5 if ≤ 0
  - Each upstream `Address` → `"localhost"` if empty

### `Validate(cfg *Config) error`

Returns an error (not fatal — caller does `log.Fatalf`) for any of:
- `cfg.Name` is empty → `"config: name is required"`
- `cfg.Port` < 1 or > 65535 → `"config: port N is out of range [1, 65535]"`
- `cfg.QoS.FailureRate` < 0 or > 1 → `"config: qos.failure_rate must be in [0, 1]"`
- `cfg.QoS.ErrorRate` < 0 or > 1 → `"config: qos.error_rate must be in [0, 1]"`
- `cfg.QuotesEnabled && cfg.QuotesFile != ""` but file doesn't exist
- `cfg.ProductsEnabled && cfg.ProductsFile != ""` but file doesn't exist

---

## 5. `internal/store/quotes.go`

```go
package store

type QuoteStore struct {
    quotes []string
}

// Load reads a text file; ignores blank lines and lines starting with '#'.
func LoadQuotes(path string) (*QuoteStore, error)

// Random returns a random quote, or "" if empty.
func (s *QuoteStore) Random() string

// Len returns the number of loaded quotes.
func (s *QuoteStore) Len() int
```

---

## 6. `internal/store/products.go`

```go
package store

type Product struct {
    Name string
    Icon string
}

type ProductStore struct {
    products []Product
}

// Load reads a pipe-delimited file: "Name | fa-icon".
// Ignores blank lines and lines starting with '#'.
func LoadProducts(path string) (*ProductStore, error)

// Random returns a random product, or zero Product{} if empty.
func (s *ProductStore) Random() Product

// Len returns the number of loaded products.
func (s *ProductStore) Len() int
```

Parse each line: `strings.SplitN(line, "|", 2)` → trim both parts.
If the icon part is empty, default to `"fa-gear"`.

---

## 7. `internal/counter/counter.go`

```go
package counter

import "sync/atomic"

type Counter struct {
    v int64
}

// Get returns the current value.
func (c *Counter) Get() int64 { return atomic.LoadInt64(&c.v) }

// Add increments by 1 and returns the new value.
func (c *Counter) Add() int64 { return atomic.AddInt64(&c.v, 1) }
```

---

## 8. `internal/qos/qos.go`

```go
package qos

import (
    "math/rand"
    "time"
    "meshsim/internal/config"
)

// ApplyQoS sleeps the configured latency+jitter and returns true if the
// failure rate fires (caller should then return HTTP 500).
func ApplyQoS(cfg config.QoSConfig) (shouldFail bool) {
    sleep := cfg.LatencyMs
    if cfg.JitterMs > 0 {
        sleep += rand.Intn(cfg.JitterMs + 1)
    }
    if sleep > 0 {
        time.Sleep(time.Duration(sleep) * time.Millisecond)
    }
    return cfg.FailureRate > 0 && rand.Float64() < cfg.FailureRate
}

// ShouldErrorUpstream returns true with probability rate.
func ShouldErrorUpstream(rate float64) bool {
    return rate > 0 && rand.Float64() < rate
}
```

---

## 9. `internal/upstream/upstream.go`

### Types

```go
package upstream

import "meshsim/internal/config"

type NodeResponse struct {
    Name        string         `json:"name"`
    Color       string         `json:"color,omitempty"`
    Icon        string         `json:"icon,omitempty"`
    Tag         string         `json:"tag,omitempty"`
    TagColor    string         `json:"tag_color,omitempty"`
    TagIcon     string         `json:"tag_icon,omitempty"`
    Address     string         `json:"address"`
    QoS         *config.QoSConfig `json:"qos,omitempty"`
    Quote       string         `json:"quote,omitempty"`
    Product     string         `json:"product,omitempty"`
    ProductIcon string         `json:"product_icon,omitempty"`
    Counter     *int64         `json:"counter,omitempty"`
    Upstreams   []NodeResponse `json:"upstreams"`
    Error       string         `json:"error,omitempty"`
}
```

### Constants

```go
const UpstreamTimeout = 3 * time.Second
```

### Functions

```go
// QueryAll fans out GET / to all upstreams concurrently.
// If rrIndex is non-nil (round-robin mode), selects only one upstream per call
// using atomic round-robin.
func QueryAll(
    ctx     context.Context,
    ups     []config.UpstreamConfig,
    errRate float64,
    rrIndex *int64,             // nil = fan-out all; non-nil = round-robin
) []NodeResponse

// queryOne calls GET / on a single upstream.
func queryOne(ctx context.Context, up config.UpstreamConfig, errRate float64) NodeResponse

// CheckHealth fans out GET /health concurrently; returns first error or nil.
func CheckHealth(ctx context.Context, ups []config.UpstreamConfig) error

// CallCountAdd calls POST /count/add on one upstream; returns counter value.
func CallCountAdd(ctx context.Context, up config.UpstreamConfig) (int64, error)
```

**Round-robin logic** in `QueryAll`:

```go
if rrIndex != nil && len(ups) > 1 {
    idx := int(atomic.AddInt64(rrIndex, 1) - 1) % len(ups)
    return []NodeResponse{queryOne(ctx, ups[idx], errRate)}
}
// else: fan out all
```

Use `http.DefaultClient` with a `context.WithTimeout(ctx, UpstreamTimeout)` for every
outbound call (same as old app).

---

## 10. `internal/server/handlers.go`

### `App` struct

```go
package server

type App struct {
    Cfg      *config.Config
    Hostname string
    Quotes   *store.QuoteStore   // nil if not enabled
    Products *store.ProductStore // nil if not enabled
    Counter  *counter.Counter    // nil if not enabled
    RRIndex  int64               // atomic round-robin cursor
}
```

### Constructor

```go
func NewApp(
    cfg      *config.Config,
    hostname string,
    quotes   *store.QuoteStore,
    products *store.ProductStore,
) *App
```

If `cfg.CounterEnabled`, set `app.Counter = &counter.Counter{}`.

### Handlers (same behaviour as old app, now using the internal packages)

```go
func (a *App) handleRoot(w http.ResponseWriter, r *http.Request)
func (a *App) handleHealth(w http.ResponseWriter, r *http.Request)
func (a *App) handleCountGet(w http.ResponseWriter, r *http.Request)
func (a *App) handleCountAdd(w http.ResponseWriter, r *http.Request)
func (a *App) handleUI(w http.ResponseWriter, r *http.Request)
func (a *App) handleUIAsset(name, contentType string) http.HandlerFunc
```

**`handleRoot`**: call `qos.ApplyQoS` → if shouldFail, return 500 JSON error.
Otherwise call `upstream.QueryAll(ctx, a.Cfg.Upstreams, a.Cfg.QoS.ErrorRate, rrPtr)`
where `rrPtr = &a.RRIndex` if `a.Cfg.RoundRobin` else `nil`.
Build `NodeResponse` and JSON-encode it.

**`handleHealth`**: call `qos.ApplyQoS`-style failure roll (only failure_rate, no sleep) →
503 if fires.  Call `upstream.CheckHealth` → 503 if error.  200 `{"status":"ok"}`.

**`handleCountAdd`**: same fan-out logic as old app, using `upstream.CallCountAdd`.

**`handleUI`**: read embedded `ui/index.html`, replace `__MESHSIM_CONFIG__` with
`{"refresh_secs": N}` JSON, serve as `text/html; charset=utf-8`.

**`handleUIAsset`**: returns an `http.HandlerFunc` that reads the named file from the
embedded `ui/` FS and serves it with the given content type.

---

## 11. `internal/server/server.go`

```go
package server

import (
    "embed"
    // ...
)

//go:embed ../../ui
var uiFS embed.FS

func NewServer(app *App) *http.Server {
    mux := http.NewServeMux()
    mux.HandleFunc("/",              app.handleRoot)
    mux.HandleFunc("/ui",            app.handleUI)
    mux.HandleFunc("/ui/styles.css", app.handleUIAsset("ui/styles.css", "text/css"))
    mux.HandleFunc("/ui/app.js",     app.handleUIAsset("ui/app.js", "application/javascript"))
    mux.HandleFunc("/health",        app.handleHealth)
    mux.HandleFunc("/count/get",     app.handleCountGet)
    mux.HandleFunc("/count/add",     app.handleCountAdd)

    return &http.Server{
        Addr:         fmt.Sprintf(":%d", app.Cfg.Port),
        Handler:      loggingMiddleware(mux),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  60 * time.Second,
    }
}
```

Note: the `//go:embed ../../ui` path is relative to the file location.  If `server.go`
lives at `internal/server/server.go`, the embed directive is `../../ui`.

### `loggingMiddleware`

Same as old app:
```
[meshsim] 2024-01-15T10:00:00Z GET / 200 3ms
```

---

## 12. `ui/index.html` (placeholder for Phase 1)

A minimal HTML file sufficient to let `/ui` respond without error:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>meshsim</title>
<link rel="stylesheet" href="./styles.css"/>
<script>
var CONFIG = __MESHSIM_CONFIG__;
</script>
</head>
<body>
<p style="font-family:sans-serif;padding:20px">
  meshsim UI — Phase 3 coming soon.<br/>
  <a href="/">View raw JSON</a>
</p>
<script src="./app.js"></script>
</body>
</html>
```

Also create minimal `ui/styles.css` and `ui/app.js` stubs (they can be empty or have
a comment) so the embed compiles.

---

## 13. Acceptance criteria for Phase 1

Run `make build` (or `go build ./cmd/meshsim`) — must succeed with no errors.

Run `go vet ./...` — must produce no warnings.

Run `gofmt -l ./...` — must produce no output (all files formatted).

Start a single instance with a test config:

```yaml
# /tmp/test.yaml
name: "Test"
color: "#3b82f6"
icon: "fa-server"
port: 9090
qos:
  latency_ms: 10
  failure_rate: 0.0
  error_rate: 0.0
```

```sh
./meshsim --config /tmp/test.yaml
```

Verify:
- `curl localhost:9090/` returns valid JSON with `name`, `color`, `address`, `upstreams: []`.
- `curl localhost:9090/health` returns `{"status":"ok"}`.
- `curl localhost:9090/count/get` returns `{"counter":0}`.
- `curl localhost:9090/ui` returns HTML (placeholder).
- Log lines appear in stdout for each request.

---

## 14. Notes & pitfalls

- The `go:embed` path in `internal/server/server.go` must resolve correctly at build time.
  Use `embed.FS` (not `[]byte`) so individual files can be read by name.
- `rand.Intn(0)` panics — always guard with `if jitterMs > 0` before calling.
- `atomic.AddInt64` requires the variable to be 64-bit aligned; declaring it as a struct
  field is safe on all platforms.
- Use `json.NewEncoder(w).Encode(node)` (not `json.Marshal`) to avoid a second allocation.
  Set `enc.SetIndent("", "  ")` for readability (same as old app).
- For `handleCountAdd`, fan-out errors are silent (contribute 0 to total), matching old app.
- `handleHealth` should not apply latency sleep — only the failure rate roll.
