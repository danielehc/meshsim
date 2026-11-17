# meshsim — Technology Choices & Architecture

> Referenced by: `PROMPT.md`  
> Used in: Phase 1, Phase 2, Phase 3, Phase 4

---

## 1. Language & runtime

- **Go 1.22** — minimum version.
- Module name: `meshsim` (local, not published).
- `go.mod` declares `module meshsim` and `go 1.22`.
- Single external dependency: `gopkg.in/yaml.v3`.
- Everything else is standard library.
- Build output: one self-contained binary named `meshsim` (or `meshsim.exe` on Windows).

---

## 2. Repository layout

```
meshsim/                       ← workspace root for the new app
├── PROMPT.md                  ← master index (this repo)
├── planning/                  ← prompt spec files (not shipped)
│   ├── TECH.md
│   ├── UXUI.md
│   ├── PHASE1.md … PHASE4.md
├── cmd/
│   └── meshsim/
│       └── main.go            ← entry point: flags, wiring, shutdown
├── internal/
│   ├── config/
│   │   └── config.go          ← Config, UpstreamConfig, QoSConfig, Load(), Validate()
│   ├── store/
│   │   ├── quotes.go          ← QuoteStore: Load(), Random()
│   │   └── products.go        ← ProductStore: Load(), Random()
│   ├── counter/
│   │   └── counter.go         ← atomic int64 Counter: Get(), Add()
│   ├── qos/
│   │   └── qos.go             ← ApplyQoS(), ShouldErrorUpstream()
│   ├── upstream/
│   │   └── upstream.go        ← NodeResponse, QueryAll(), CheckHealth(), CallCountAdd()
│   └── server/
│       ├── server.go          ← NewServer(), loggingMiddleware, timeouts
│       └── handlers.go        ← App struct, all HTTP handlers
├── ui/
│   ├── index.html             ← shell: <link>, <script src>, config token
│   ├── styles.css             ← all CSS (theme tokens, layout, components)
│   └── app.js                 ← all JavaScript (graph, render, fetch, drag/pan/zoom)
├── configs/
│   ├── monolith/
│   ├── two-tier/
│   ├── three-tier/
│   ├── microservices/
│   └── replication/
├── go.mod
├── go.sum
├── Makefile
└── run.sh
```

---

## 3. Internal package responsibilities

### `internal/config`

- Types: `Config`, `UpstreamConfig`, `QoSConfig`.
- `Load(path string) (*Config, error)` — reads YAML, applies defaults.
- `Validate(cfg *Config) error` — fails if: `Name` empty, `Port` outside 1–65535,
  any rate (`FailureRate`, `ErrorRate`) outside [0, 1], any referenced data file
  doesn't exist when the corresponding feature is enabled.
- New field: `RoundRobin bool` (yaml: `round_robin`) — enables round-robin upstream
  selection on this instance.
- All old fields preserved: `Name`, `Color`, `Icon`, `Tag`, `TagColor`, `TagIcon`,
  `Port`, `Upstreams`, `QoS`, `QuotesEnabled`, `QuotesFile`, `ProductsEnabled`,
  `ProductsFile`, `CounterEnabled`, `UIRefreshSecs`.

### `internal/store`

- `QuoteStore`: loads a text file (one quote per line; `#` = comment; blank = skip),
  exposes `Random() string`.  Returns `""` if empty.
- `ProductStore`: loads a pipe-delimited file (`Name | fa-icon`), exposes
  `Random() Product` where `Product{Name, Icon string}`.  Returns zero value if empty.

### `internal/counter`

- `Counter`: wraps `sync/atomic` int64.
- Methods: `Get() int64`, `Add() int64` (increments and returns new value).

### `internal/qos`

- `ApplyQoS(cfg config.QoSConfig) (shouldFail bool)` — sleeps latency+jitter,
  returns true if the failure roll fires.
- `ShouldErrorUpstream(rate float64) bool` — returns true with probability `rate`.
- Uses `math/rand` (no seed needed; Go 1.20+ auto-seeds the global source).

### `internal/upstream`

- `NodeResponse` struct — identical JSON shape to old app (see §4 below).
- `QueryAll(ctx, upstreams, errorRate, roundRobin) []NodeResponse` — concurrent
  fan-out; if `roundRobin` is true, picks only **one** upstream (the next in rotation)
  rather than all.  Round-robin state is passed in as `*int64` (atomic index).
- `CheckHealth(ctx, upstreams) error` — concurrent `/health` check, first error wins.
- `CallCountAdd(ctx, up) (int64, error)` — POST `/count/add` to one upstream.

### `internal/server`

- `NewServer(app *App) *http.Server` — registers all routes, wraps with
  `loggingMiddleware`, sets timeouts (read 15s, write 30s, idle 60s).
- `App` struct holds: `*config.Config`, hostname, `*store.QuoteStore`,
  `*store.ProductStore`, `*counter.Counter` (nil if not enabled),
  `rrIndex int64` (atomic round-robin cursor).

---

## 4. HTTP API (unchanged from old app)

| Method / Path | Behaviour |
|---------------|-----------|
| `GET /` | Apply QoS → fan out to upstreams (or single round-robin pick) → return `NodeResponse` JSON |
| `GET /ui` | Serve `index.html` with `__MESHSIM_CONFIG__` replaced by a JSON object |
| `GET /ui/styles.css` | Serve `styles.css` as `text/css` |
| `GET /ui/app.js` | Serve `app.js` as `application/javascript` |
| `GET /health` | Failure roll → 503; concurrent upstream health checks → first non-200 → 503; else 200 |
| `GET /count/get` | Return `{"counter": N}` for this instance only |
| `POST /count/add` | If counter owned: increment + return. Else: fan out and return sum. |

### Config injection

`index.html` contains the literal token `__MESHSIM_CONFIG__` (no surrounding quotes) in
a `<script>` block:

```html
<script>
var CONFIG = __MESHSIM_CONFIG__;
</script>
```

The `/ui` handler replaces `__MESHSIM_CONFIG__` with a JSON object:

```json
{ "refresh_secs": 5 }
```

(Extend the object with more fields in future phases without breaking the token approach.)

### NodeResponse JSON shape

```json
{
  "name":         "Frontend",
  "color":        "#347a16",
  "icon":         "fa-globe",
  "tag":          "v1",
  "tag_color":    "#fbbf24",
  "tag_icon":     "fa-bolt",
  "address":      "192.168.1.5:8080",
  "qos":          { "latency_ms": 0, "jitter_ms": 0, "failure_rate": 0, "error_rate": 0 },
  "quote":        "...",
  "product":      "Nimbus Cache",
  "product_icon": "fa-bolt",
  "counter":      42,
  "upstreams":    [ { "name": "Backend", "address": "...", ... } ],
  "error":        ""
}
```

- `counter` is omitted (not `null`) when `counter_enabled` is false.
- `error` is omitted when there is no error.
- `upstreams` is always present (empty array `[]` when no upstreams).

---

## 5. New feature: round-robin upstream selection

When `round_robin: true` is set in a node's config, `GET /` calls only **one** upstream
per request, cycling through the list in order (0, 1, 2, 0, 1, …) using an atomic int64
counter mod len(upstreams).

- If `upstreams` is empty, behaves normally (returns empty upstreams array).
- The `GET /health` endpoint still checks **all** upstreams regardless of round_robin.
- The `POST /count/add` fan-out still goes to **all** upstreams regardless of round_robin.
- Round-robin state resets on process restart (in-memory only).

Typical use: `LoadBalancer` node in the replication scenario.

---

## 6. Icon system

Font Awesome CDN is **replaced** by an inline SVG icon map.

- A Go file (`internal/server/icons.go` or embedded in `ui/app.js`) holds a map of
  icon name → SVG path data for the ~30 icons from the old `docs/Icons.md`.
- In SVG node cards, icons are drawn with `<path>` elements using the path data.
- In HTML overlays (WebApp panel), icons are drawn with inline `<svg>` tags.
- The icon name convention is preserved: `fa-gear`, `fa-server`, etc.  The `fa-` prefix
  is optional in config (both `gear` and `fa-gear` are accepted).

Full icon list (from `../meshsim_old/docs/Icons.md`):

```
fa-gear, fa-server, fa-database, fa-globe, fa-box, fa-box-open,
fa-shuffle, fa-cloud, fa-linux, fa-windows, fa-plug, fa-lock,
fa-bolt, fa-key, fa-layer-group, fa-hard-drive, fa-chart-line,
fa-network-wired, fa-spider, fa-puzzle-piece, fa-satellite-dish,
fa-envelope, fa-dharmachakra, fa-terminal, fa-copy, fa-circle,
fa-bookmark, fa-tag, fa-dollar-sign
```

---

## 7. UI file serving

The `ui/` directory is embedded with:

```go
//go:embed ui
var uiFS embed.FS
```

- `GET /ui` → handler reads `ui/index.html`, replaces `__MESHSIM_CONFIG__`, serves as
  `text/html; charset=utf-8`.
- `GET /ui/styles.css` → handler reads `ui/styles.css`, serves as `text/css`.
- `GET /ui/app.js` → handler reads `ui/app.js`, serves as `application/javascript`.
- `index.html` references `./styles.css` and `./app.js` via relative URLs.

---

## 8. Build & toolchain

### Makefile targets

| Target | Action |
|--------|--------|
| `build` (default) | `go build -o meshsim ./cmd/meshsim` with version ldflags |
| `run` | `./run.sh` |
| `fmt` | `gofmt -w ./...` |
| `vet` | `go vet ./...` |
| `check` | `fmt` + `vet` |
| `dist` | Cross-compile: linux amd64/arm64, darwin amd64/arm64, windows amd64 → `dist/` |
| `clean` | Remove `meshsim` binary and `dist/` |
| `help` | Print targets |

Version ldflags: `-X main.Version=$(git describe --tags --always --dirty 2>/dev/null || echo dev)`

### run.sh

- Checks if `meshsim` binary is missing or older than any `*.go` file → runs `make build`.
- Lists folders in `configs/` alphabetically, presents a numbered menu.
- Launches every `*.yaml` in the chosen folder: `./meshsim --config <file> &`
- Prints the `/ui` URL for each instance.
- On Ctrl+C: kills all launched PIDs, prints "Stopped."

---

## 9. Local IP detection

Same as old app: UDP dial to `8.8.8.8:80`, read `LocalAddr`, fall back to `os.Hostname()`.
Lives in `cmd/meshsim/main.go`.

---

## 10. Graceful shutdown

Same as old app: `signal.Notify` on `SIGINT`/`SIGTERM`, 5-second context timeout for
`srv.Shutdown(ctx)`.

---

## 11. CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `config.yaml` | Path to YAML config |
| `--quotes-file` | `""` | Override `quotes_file` from config (also sets `quotes_enabled: true`) |
| `--products-file` | `""` | Override `products_file` (also sets `products_enabled: true`) |
| `--counter` | `false` | Force-enable counter (OR with config value) |

`.hcl` extension → fatal error with message "HCL format not supported, use YAML".
