# meshsim — Application Description

## 1. Purpose

meshsim is a small, self-contained Go tool that **simulates a multi-tier service mesh** for demos, teaching and
observability experiments. One binary is built; many instances are launched at the same time, each started with its
own YAML config file. Instances call each other over HTTP according to the `upstreams` declared in their config,
forming topologies such as `Frontend → API_1 / API_2 → Backend`. Any instance serves a browser UI that draws the
whole topology it can reach, as a live network diagram.

Typical uses: show how latency, failures and errors propagate through tiers; demo a "shop" scenario
(webapp with a Buy button, product and quote of the moment, shared counter); provide a lightweight workload for
monitoring, tracing, load-balancing or service-mesh tooling.

## 2. Runtime model

- Language: Go (go 1.20 in `go.mod`), single external dependency `gopkg.in/yaml.v3`; everything else is stdlib.
- One process = one simulated service. It listens on `port`, and knows only its direct upstreams
  (`name`, `address` default `localhost`, `port`).
- Startup flow: parse flags → load YAML (defaults applied) → load optional quotes/products files → build `App`
  state → start HTTP server → graceful shutdown on SIGINT/SIGTERM (5 s timeout).
- Own address shown in responses is the detected local IP (UDP dial to `8.8.8.8:80`, falling back to hostname) + port.
- CLI flags (override config): `--config <path>` (default `config.yaml`), `--quotes-file`, `--products-file`,
  `--counter`. An `.hcl` config is explicitly rejected with an error; YAML only.
- All routes are wrapped by a logging middleware (timestamp, method, path, status, duration).
  Server timeouts: read 15 s, write 30 s, idle 60 s. Upstream calls time out after 3 s.
- The UI (`src/ui/index.html`) is embedded in the binary with `//go:embed`; no runtime file dependencies except the
  optional data files. Font Awesome is loaded from a CDN by the browser.

## 3. Configuration (YAML, one file per instance)

| Key | Meaning | Default |
|-----|---------|---------|
| `name`, `color`, `icon` | Display name, hex banner colour, Font Awesome icon (`fa-server`, …) | – / `#3b82f6` / `fa-gear` |
| `port` | Listening port | 8080 |
| `tag`, `tag_color`, `tag_icon` | Optional badge (e.g. version label) on the node card | empty |
| `upstreams[]` | Peers called on every `GET /` | none |
| `qos.latency_ms` / `jitter_ms` | Fixed delay + random `[0, jitter]` delay per request | 0 |
| `qos.failure_rate` | Probability this instance answers HTTP 500 (also 503 on `/health`) | 0 |
| `qos.error_rate` | Probability each outgoing upstream call is simulated as errored without a network call | 0 |
| `quotes_enabled`, `quotes_file` | Return a random quote from a text file | false |
| `products_enabled`, `products_file` | Return a random product from a file | false |
| `counter_enabled` | Own an in-memory atomic counter | false |
| `ui_refresh_secs` | UI auto-refresh interval | 5 |

Data files: `quotes.txt` has one quote per line; `products.txt` has `Product Name | fa-icon` per line (names are
short, two words). In both, blank lines and lines starting with `#` are ignored.

## 4. HTTP API

| Method / path | Behaviour |
|---------------|-----------|
| `GET /` | Applies QoS (sleep latency+jitter, then failure roll → 500 JSON error). Otherwise queries **all upstreams concurrently** (`GET /`) and returns a recursive `NodeResponse` JSON: name, color, icon, tag fields, address, qos, optional `quote`, `product`, `product_icon`, `counter`, and `upstreams[]`. |
| `GET /ui` | Serves the embedded SPA, injecting `var __REFRESH_SECS__ = N;` into the first `<script>` tag. |
| `GET /health` | Failure-rate roll (→ 503 `degraded`), then concurrent `GET /health` on every upstream; any non-200 → 503, otherwise 200 `{"status":"ok"}`. |
| `GET /count/get` | Returns `{"counter":n}` for the local counter only (0 if not enabled). Never fans out. |
| `POST /count/add` | If the instance owns a counter: increment and return it. Otherwise fan out `POST /count/add` to all upstreams concurrently and return the **sum** (failed upstreams contribute 0). |

An unreachable/erroring upstream appears in the tree as `{name, address, error}` rather than failing the whole
request, so partial topologies still render. Non-200 upstream responses and JSON decode errors are reported the same way.

## 5. Web UI (single self-contained HTML, ~900 lines, vanilla JS + SVG)

- Fetches `GET /` of the instance it was loaded from, builds a node graph, and re-renders on a single refresh timer
  (no stacking timers, manual refresh available, error banner when the fetch fails). Boot is deferred ~50 ms so the
  container has a non-zero size.
- Layout: nodes ranked by BFS depth (root on top, leaves at the bottom); edges are cubic Bézier curves with a dot
  terminus. Pan by dragging the canvas, zoom with the wheel, drag individual nodes (positions persist across refreshes).
- Node card (210×108 px, 30 px coloured banner with icon + name): address in monospace, green/red status dot,
  QoS summary lines (`latency · jitter`, `fail % · err %`), optional square counter box (top-right, shown when the
  counter is > 0, font scaled by digits), optional tag (icon + label, bottom-right).
- Pure SVG primitives only (no `foreignObject`); Font Awesome glyphs in SVG are drawn through a codepoint map
  (`FA_GLYPHS`), real `<i class="fa-solid …">` elements are used only in HTML overlays. `docs/Icons.md` lists
  the supported icon names.
- Dark/light theme following the OS with a manual toggle in the status bar; the status bar takes the root node colour.
- **WebApp overlay** (fixed left panel, 232×495 px) appears only if the topology contains any quote/product/counter
  data: fake window title bar with traffic-light dots, a random product (icon + name), a random quote as description,
  and a **Buy** button that issues `POST /count/add` (relative URL), flashes "Done!" and immediately re-renders so
  counters update.
- Works in Chrome and Firefox.

## 6. Source layout (`src/`, `package main`)

| File | Responsibility |
|------|----------------|
| `main.go` | Flags, config load, stores, server start, graceful shutdown, `localIP()` |
| `config.go` | `Config`, `UpstreamConfig`, `QoSConfig`, YAML loading and defaults |
| `server.go` | Mux, route registration, logging middleware, server timeouts |
| `handlers.go` | `App` state and handlers for `/`, `/health`, `/count/*`, `/ui` |
| `upstream.go` | `NodeResponse`, concurrent upstream queries, upstream health check, 3 s timeout |
| `qos.go` | `applyQoS`, `qosMiddleware`, `shouldErrorUpstream` (math/rand rolls) |
| `quotes.go`, `products.go` | Text-file stores with `Random()` |
| `counter.go` | Atomic int64 counter |
| `ui.go`, `ui/index.html` | Embedded frontend |

## 7. Scenarios, scripts and build

- `configs/<scenario>/` folders each hold one YAML per instance plus shared `quotes.txt`/`products.txt`:
  `monolith` (Frontend only, 8080), `two-tier` (Frontend → Backend), `three-tier` (Frontend → API → Backend),
  `three-tier-multi` (Frontend → API_1 + API_2 → Backend, ports 8080–8083; API_1 tag v1 with 20 ms/10 ms/5 % failure,
  API_2 tag v2 with 10 ms; Backend with quotes, products and counter), `test` (full topology with feature flags).
  Some legacy flat configs also sit directly in `configs/`.
- `run-local.sh` / `run-local_2.sh`: build the binary when missing or stale, optionally pick a scenario (`-q` shows a
  numbered menu; default is the first folder alphabetically), launch every `*.yaml` in it in the background, print
  the `/ui` URLs, and stop all PIDs on Ctrl+C.
- `Makefile`: `build` (default, `go build -o meshsim ./src` with version ldflags), `run`, `fmt`, `vet`, `test`, `check`,
  `dist` (linux amd64/arm64, darwin amd64/arm64, windows amd64 into `dist/`), `clean`, `help`.

## 8. Repository contents that are not application code

`docs/.boxb/` (unrelated AI/BoxB guide material, skills examples, PDF/ODT build scripts), `.bob/`, `bob_prompts/`
(`PROMPT.md` reconstruction prompt and `PROJECT.md` full-source dump from an earlier generation), `dist/`, the
prebuilt `meshsim` binary and `assets/`. Only `src/`, `configs/`, `docs/Icons.md`, `docs/ui_example.png`, scripts,
`Makefile`, `go.mod` and `README.md` are relevant to the app.

## 9. Known weaknesses to address in the refactor

- No automated tests, although `make test` exists; `main.Version` is referenced by ldflags but not declared.
- `qos.go` (`applyQoS`, `qosMiddleware`) is unused; `handleRoot` and `handleHealth` duplicate the QoS logic inline.
- Everything lives in `package main`; handlers build URLs and HTTP calls by hand (no shared client or helper,
  `http.DefaultClient`), and `callCountAdd` duplicates the upstream-call pattern.
- Formatting is inconsistent (not gofmt-clean); the UI is a single 900-line file with inline CSS/JS.
- Fan-out is unbounded and has no loop protection for cyclic upstream definitions (recursion in `GET /`).
- Config has no validation (port range, rates within 0–1, missing names, missing files for enabled features).
- Two near-identical run scripts, and duplicated per-scenario `quotes.txt`/`products.txt` copies.
- UI configuration is injected by string replacement of `<script>\n`, which is fragile; a config/JSON endpoint would be cleaner.
- Font Awesome comes from a CDN, so the UI is not fully offline-capable.
