# meshsim — Phase 4: Polish, Documentation, and Final Wiring

> **Goal**: everything that makes the project production-ready for demos — clean README,
> icon reference doc, `go vet` / `gofmt` clean throughout, final cross-platform build
> check, and any loose ends from Phases 1–3.
>
> **Read first**: `PROMPT.md` (the full non-goals list) and `TECH.md`.  
> Phases 1, 2, and 3 must all be complete before starting this phase.

---

## 1. Checklist before starting

Run these commands and fix any failures before proceeding:

```sh
go build ./...          # must succeed
go vet ./...            # must produce no output
gofmt -l ./...          # must produce no output (all files formatted)
make dist               # all 5 cross-compile targets must succeed
./run.sh                # scenario menu works; all scenarios start and stop cleanly
```

Also manually test each scenario in a browser:
- [ ] monolith
- [ ] two-tier
- [ ] three-tier
- [ ] microservices
- [ ] replication (verify round-robin alternation)

---

## 2. `README.md`

Create `README.md` at the repo root (`meshsim/README.md`).  Sections:

### 2.1 Header & badge line

```markdown
# meshsim

A lightweight Go tool for simulating multi-tier service mesh topologies.
Runs multiple instances simultaneously; each instance serves a live network
diagram showing the whole reachable topology.
```

### 2.2 Screenshot

```markdown
## Screenshot

![meshsim UI](docs/ui_example.png)
```

(Copy `../meshsim_old/docs/ui_example.png` to `meshsim/docs/ui_example.png`.)

### 2.3 Quick start

```markdown
## Quick start

\```sh
# Build
make build

# Run a scenario (interactive menu)
./run.sh

# Open the UI in your browser
open http://localhost:8080/ui
\```
```

### 2.4 Scenarios

Brief description of each scenario with its topology diagram (ASCII art, same as in
`PHASE2.md`) and the ports used.

### 2.5 Configuration reference

A Markdown table of all YAML keys, their types, defaults, and descriptions.  
Reproduce and update the table from `APPLICATION.md §3`, adding the new `round_robin` field.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | string | *required* | Display name shown on the node card |
| `color` | string | `#3b82f6` | Hex banner colour |
| `icon` | string | `fa-gear` | Icon name (see Icons reference) |
| `tag` | string | — | Optional short badge label |
| `tag_color` | string | node color | Badge colour |
| `tag_icon` | string | circle | Badge icon |
| `port` | int | `8080` | Listening port (1–65535) |
| `upstreams[]` | list | — | Peer services to call on GET / |
| `qos.latency_ms` | int | `0` | Fixed delay (ms) per request |
| `qos.jitter_ms` | int | `0` | Random extra delay 0–N ms |
| `qos.failure_rate` | float | `0.0` | Probability of HTTP 500 response [0–1] |
| `qos.error_rate` | float | `0.0` | Probability of simulated upstream error [0–1] |
| `quotes_enabled` | bool | `false` | Return a random quote in GET / |
| `quotes_file` | string | — | Path to quotes file (required when `quotes_enabled`) |
| `products_enabled` | bool | `false` | Return a random product in GET / |
| `products_file` | string | — | Path to products file (required when `products_enabled`) |
| `counter_enabled` | bool | `false` | Own an in-memory counter |
| `round_robin` | bool | `false` | Call only one upstream per request, cycling in order |
| `ui_refresh_secs` | int | `5` | UI auto-refresh interval |

### 2.6 HTTP API reference

Reproduce the table from `TECH.md §4` in a simpler form.

### 2.7 Building

```markdown
## Building

| Command | Action |
|---------|--------|
| `make build` | Compile for current platform |
| `make dist` | Cross-compile for linux/darwin/windows × amd64/arm64 |
| `make check` | Run gofmt + go vet |
| `make clean` | Remove binary and dist/ |
```

### 2.8 Limitations

```markdown
## Limitations

- No cycle/loop detection: if instance A lists B as upstream and B lists A,
  GET / will recurse until timeout. Keep topologies acyclic.
- No TLS or authentication.
- Counter state is in-memory only; it resets on process restart.
- Round-robin state resets on process restart.
```

---

## 3. `docs/Icons.md`

Create `meshsim/docs/Icons.md`.  Update the icon reference from the old app to reflect
the new SVG-based system (no Font Awesome CDN reference).

```markdown
# meshsim — Icon Reference

Icons are rendered using inline SVG paths extracted from
[Font Awesome 6 Free](https://fontawesome.com/icons) (Solid style, SIL OFL 1.1).
**No CDN or external dependency** — all paths are bundled in the binary.

Set the `icon` field in your config to any value from the **Config value** column.
The `fa-` prefix is optional (`gear` and `fa-gear` are both accepted).

\```yaml
name: "My Service"
icon: "fa-server"
\```

## Available icons

| Name | Config value | Typical use |
|------|-------------|-------------|
| Gear *(default)* | `fa-gear` | Generic service |
| Server | `fa-server` | API / app logic |
| Database | `fa-database` | Storage / data layer |
| Globe | `fa-globe` | Web frontend |
| Box (closed) | `fa-box` | Package / artifact |
| Box (open) | `fa-box-open` | Open product / store |
| Shuffle | `fa-shuffle` | Load balancer / proxy |
| Cloud | `fa-cloud` | Cloud service |
| Plug | `fa-plug` | Connector / integration |
| Lock | `fa-lock` | Auth / security |
| Bolt | `fa-bolt` | Function / hot path |
| Key | `fa-key` | Secrets / auth |
| Layer group | `fa-layer-group` | Monolith / stack |
| Hard drive | `fa-hard-drive` | Storage |
| Chart line | `fa-chart-line` | Metrics / monitoring |
| Network wired | `fa-network-wired` | Network / exchange |
| Spider | `fa-spider` | Service mesh |
| Puzzle piece | `fa-puzzle-piece` | Microservice |
| Satellite dish | `fa-satellite-dish` | Signal / broadcast |
| Envelope | `fa-envelope` | Queue / messaging |
| Dharmachakra | `fa-dharmachakra` | Kubernetes |
| Terminal | `fa-terminal` | CLI / shell |
| Copy | `fa-copy` | Replication |
| Circle | `fa-circle` | Generic dot |
| Bookmark | `fa-bookmark` | Stable release |
| Tag | `fa-tag` | Label / channel |
| Dollar sign | `fa-dollar-sign` | Payment |
| Linux | `fa-linux` | Linux (brand) |
| Windows | `fa-windows` | Windows (brand) |

## Tag icons

The `tag_icon` field accepts the same names as `icon`.
If omitted, the tag renders as a filled circle (default).

| Config value | Typical use |
|-------------|-------------|
| *(omit)* or `fa-circle` | Generic version label |
| `fa-bolt` | Hot path, breaking change |
| `fa-bookmark` | Stable / pinned |
| `fa-tag` | Release channel |
```

---

## 4. `docs/` directory

```
meshsim/docs/
├── Icons.md          ← from §3 above
└── ui_example.png    ← copy from ../meshsim_old/docs/ui_example.png
```

Copy the screenshot:
```sh
cp ../meshsim_old/docs/ui_example.png docs/ui_example.png
```

---

## 5. `.gitignore`

Create `meshsim/.gitignore`:

```gitignore
# Build output
meshsim
meshsim.exe
dist/

# Go toolchain
*.test
*.out

# macOS
.DS_Store

# Editor
.vscode/
.idea/
*.swp
```

---

## 6. Final code review checklist

Go through every file in `cmd/` and `internal/` and verify:

### 6.1 No dead code

- [ ] All exported functions are used by at least one caller.
- [ ] No commented-out code blocks.
- [ ] `qos.go` functions are called from `handlers.go` (not duplicated inline).
- [ ] `upstream.go` `QueryAll` is the only fan-out function (no duplicated `callCountAdd`
  pattern in `handlers.go` — use `upstream.CallCountAdd`).

### 6.2 Error handling

- [ ] All `os.ReadFile` calls check the error.
- [ ] YAML parse errors are propagated, not ignored.
- [ ] Upstream HTTP errors are reported as `NodeResponse.Error`, not panicked.

### 6.3 Formatting

- [ ] `gofmt -l ./...` produces no output.
- [ ] Import groups: stdlib, then external, separated by a blank line.

### 6.4 Naming

- [ ] Exported types: `Config`, `App`, `NodeResponse`, `QuoteStore`, `ProductStore`,
  `Counter` — all PascalCase.
- [ ] Package names: all lowercase single words (`config`, `store`, `counter`, `qos`,
  `upstream`, `server`).

### 6.5 Version

- [ ] `main.go` declares `var Version = "dev"`.
- [ ] Makefile sets `ldflags` with `-X main.Version=$(git describe ...)`.
- [ ] The startup log line includes the version: `[meshsim v1.0.0] Starting...`
  (format: `[meshsim VERSION]`).

---

## 7. Startup log format (final)

```
[meshsim dev] Starting instance "Frontend" on port 8080 (color: #347a16, icon: fa-globe)
[meshsim dev]   upstream: Backend @ localhost:8081
[meshsim dev] Loaded 34 quotes from configs/monolith/quotes.txt
[meshsim dev] Loaded 10 products from configs/monolith/products.txt
[meshsim dev] Listening on :8080
```

The version tag appears in every log line prefix.  Update `loggingMiddleware` to use the
same prefix (or just use `log.SetPrefix(fmt.Sprintf("[meshsim %s] ", Version))`).

---

## 8. Acceptance criteria for Phase 4

1. `make build` succeeds and the version string is embedded:
   ```sh
   ./meshsim --version   # not required, but the build log should show the version
   ```
   (Optional: add a `--version` flag in `main.go`.)

2. `make dist` produces 5 binaries in `dist/` with no errors.

3. `go vet ./...` — no output.

4. `gofmt -l ./...` — no output.

5. All 5 scenarios run end-to-end from `run.sh`.

6. `README.md` renders correctly on GitHub (check local with a Markdown previewer).

7. `docs/Icons.md` lists all 29 icons.

8. Opening `/ui` on any scenario shows the correct topology with no console errors
   in the browser.

9. No browser network tab request to `cdnjs.cloudflare.com` or any other external host.

---

## 9. Optional enhancements (out of scope, document for future)

These are **not** required for Phase 4 but worth noting in the README as future work:

- `--version` flag.
- `/metrics` endpoint (Prometheus-compatible).
- Cycle detection via `X-Visited-Nodes` header.
- Per-instance configurable port exposure for Docker/Kubernetes demos.
- Automated tests for config loading and QoS logic.
- A `docker-compose.yml` per scenario.
