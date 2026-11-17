#!/usr/bin/env bash
# meshsim launcher: builds the binary if needed, shows a scenario menu and starts
# every *.yaml in the chosen configs/ folder.
# Written for bash 3.2+ (macOS default), so it avoids `mapfile`.
set -euo pipefail

cd "$(dirname "$0")"

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
scenarios=()
while IFS= read -r d; do
  scenarios+=("$d")
done < <(find "$CONFIGS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

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
if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#scenarios[@]} )); then
  echo "Invalid selection: $choice" >&2
  exit 1
fi
scenario="${scenarios[$((choice-1))]}"
echo "Running scenario: $(basename "$scenario")"
echo ""

# ── 3. Launch all *.yaml files in the chosen folder ───────────────────────────
configs=()
while IFS= read -r c; do
  configs+=("$c")
done < <(find "$scenario" -maxdepth 1 -name "*.yaml" | sort)

if [[ ${#configs[@]} -eq 0 ]]; then
  echo "No *.yaml files found in $scenario" >&2
  exit 1
fi

pids=()

# ── 5. Cleanup on Ctrl+C ─────────────────────────────────────────────────────
cleanup() {
  trap - INT TERM
  echo ""
  echo "Stopping all instances..."
  for pid in ${pids[@]+"${pids[@]}"}; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "Stopped."
  exit 0
}
trap cleanup INT TERM

for cfg in "${configs[@]}"; do
  $BINARY --config "$cfg" &
  pids+=($!)
done

# ── 4. Print /ui URLs ──────────────────────────────────────────────────────────
sleep 0.3   # give instances a moment to start
echo ""
echo "Instances running:"
for cfg in "${configs[@]}"; do
  port=$(grep -E '^[[:space:]]*port[[:space:]]*:' "$cfg" | head -1 | grep -oE '[0-9]+' | head -1 || true)
  name=$(grep -E '^[[:space:]]*name[[:space:]]*:' "$cfg" | head -1 | sed 's/^[^:]*: *//; s/ *#.*//; s/"//g' || true)
  printf "  %-20s http://localhost:%s/ui\n" "$name" "${port:-8080}"
done
echo ""
echo "Press Ctrl+C to stop all instances."
echo ""

wait
