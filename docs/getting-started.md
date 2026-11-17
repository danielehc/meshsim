# Getting Started

**meshsim** is a lightweight Go tool that simulates multi-tier service mesh topologies. Each instance
represents one service; instances call each other over HTTP and render a live network diagram in the
browser showing health, latency, and QoS parameters for the entire reachable topology.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| **Go** | 1.22 | Only needed when building from source |
| **bash** | 3.2+ | Used by `run.sh` — the macOS default is sufficient |
| A modern browser | — | Chrome or Firefox |

No other dependencies are required. The binary is self-contained: the UI is embedded, and the only
external resource the browser loads is the Font Awesome icon font (CDN) for the HTML status bar.

---

## Installation

### Option A — Pre-built binaries

Download the binary for your platform from the
[latest GitHub Release](https://github.com/YOUR_ORG/meshsim/releases/latest) and make it executable.
Each release also ships a `SHA256SUMS` file, and the `edge` prerelease tracks the newest `main`
(see [Release Process](releasing.md)).

```sh
# macOS (Apple Silicon)
curl -L https://github.com/YOUR_ORG/meshsim/releases/latest/download/meshsim-darwin-arm64 \
     -o meshsim && chmod +x meshsim

# macOS (Intel)
curl -L https://github.com/YOUR_ORG/meshsim/releases/latest/download/meshsim-darwin-amd64 \
     -o meshsim && chmod +x meshsim

# Linux (amd64)
curl -L https://github.com/YOUR_ORG/meshsim/releases/latest/download/meshsim-linux-amd64 \
     -o meshsim && chmod +x meshsim

# Linux (arm64)
curl -L https://github.com/YOUR_ORG/meshsim/releases/latest/download/meshsim-linux-arm64 \
     -o meshsim && chmod +x meshsim

# Windows (amd64) — PowerShell
Invoke-WebRequest -Uri https://github.com/YOUR_ORG/meshsim/releases/latest/download/meshsim-windows-amd64.exe `
                  -OutFile meshsim.exe
```

The binary alone does not include the scenario configs or `run.sh`; clone the repository (or
download it as a zip) to use the ready-made scenarios in `configs/`.

> **macOS Gatekeeper:** on first run macOS may show a security warning. Open
> **System Preferences → Security & Privacy → General** and click **Allow Anyway**, or run:
> ```sh
> xattr -d com.apple.quarantine ./meshsim
> ```

### Option B — Build from source

```sh
# Clone the repository
git clone https://github.com/YOUR_ORG/meshsim.git
cd meshsim

# Build (requires Go 1.22+)
make build
```

The `make build` command produces a single `./meshsim` binary. The only external Go dependency is
`gopkg.in/yaml.v3`; the UI is embedded directly in the binary at compile time.

Cross-compile for all supported platforms at once:

```sh
make dist        # produces binaries in dist/
```

---

## Quick Start

### 1. Run the interactive scenario launcher

```sh
./run.sh
```

The launcher will:
1. Build the binary if it is missing or older than any `.go` file.
2. Display a numbered menu of all scenarios in `configs/`.
3. Launch every `*.yaml` in the chosen scenario folder as a background process.
4. Print the `/ui` URL for each instance.
5. Stop all instances cleanly when you press **Ctrl+C**.

Example output:

```
Available scenarios:
  1) microservices
  2) monolith
  3) replication
  4) three-tier
  5) two-tier

Select scenario [1]: 1
Running scenario: microservices

Instances running:
  Frontend             http://localhost:8080/ui
  Quotes               http://localhost:8081/ui
  Products             http://localhost:8082/ui
  Payment              http://localhost:8083/ui
  Backend              http://localhost:8084/ui

Press Ctrl+C to stop all instances.
```

Open any of the printed URLs in your browser to see the live topology diagram.

### 2. Or use `make run`

```sh
make run
```

`make run` builds the binary first (same as `make build`) and then calls `run.sh`.

### 3. Start a single instance by hand

```sh
./meshsim --config configs/two-tier/frontend.yaml
```

Then open `http://localhost:8080/ui` in your browser.

---

## Command-Line Flags

| Flag | Default | Description |
|---|---|---|
| `--config <path>` | `config.yaml` | Path to the YAML config file |
| `--quotes-file <path>` | — | Override `quotes_file`; also enables quotes |
| `--products-file <path>` | — | Override `products_file`; also enables products |
| `--counter` | `false` | Force-enable the in-memory counter |

Flags override the values in the YAML file. Only YAML config is supported; `.hcl` files are
explicitly rejected with an error message.

**Example — start a service with a custom quotes file and the counter enabled:**

```sh
./meshsim --config configs/monolith/frontend.yaml \
          --quotes-file my-quotes.txt \
          --counter
```

---

## Makefile Reference

| Command | Action |
|---|---|
| `make build` | Compile the binary for the current platform |
| `make run` | Build then launch the scenario menu |
| `make fmt` | Format all Go source files with `gofmt` |
| `make vet` | Run `go vet ./...` |
| `make check` | Run `fmt` + `vet` |
| `make dist` | Cross-compile for Linux/macOS/Windows × amd64/arm64 into `dist/` |
| `make clean` | Remove the binary and `dist/` |
| `make help` | Print the command list |

---

## Running with Docker

> **Note:** The `docker-compose.yml` files are planned but not yet included in the repository.
> The steps below use the Docker CLI directly.

### Single instance

```sh
docker run --rm \
  -p 8080:8080 \
  -v "$(pwd)/configs/monolith:/configs" \
  meshsim:latest \
  --config /configs/frontend.yaml
```

### Multi-instance scenario (manual)

Bring up each service on its own container within a shared network:

```sh
docker network create meshsim-net

docker run -d --name backend --network meshsim-net \
  -p 8081:8081 \
  -v "$(pwd)/configs/two-tier:/configs" \
  meshsim:latest --config /configs/backend.yaml

docker run -d --name frontend --network meshsim-net \
  -p 8080:8080 \
  -v "$(pwd)/configs/two-tier:/configs" \
  meshsim:latest --config /configs/frontend.yaml
```

Then open `http://localhost:8080/ui`.

> **Tip:** When running in Docker, set the `address` field of each upstream to the container name
> (e.g. `address: backend`) instead of `localhost`.

---

## Verifying the installation

Once at least one instance is running you can verify it via the health endpoint:

```sh
curl -s http://localhost:8080/health
# {"status":"ok"}
```

A `200` response with `{"status":"ok"}` confirms the instance is up and all its upstreams are
reachable.

---

## Next steps

- Read the [Scenarios guide](scenarios.md) to understand the pre-built topologies.
- Read the [Configuration reference](configuration.md) to learn every YAML field.
- Read the [UI guide](ui-guide.md) to get the most out of the browser interface.
- Read the [QoS guide](qos-guide.md) to simulate latency and failures.
- Read the [Creating scenarios](creating-scenarios.md) guide to build your own topology.
