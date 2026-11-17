#!/usr/bin/env bash
#
# launch_phase_1.sh — launch and verify the Phase 1 backend against PHASE1.md / TECH.md.
#
# Usage:
#   ./launch_phase_1.sh            interactive menu (launch a scenario and poke at it)
#   ./launch_phase_1.sh <name>     launch one scenario and keep it running (Ctrl+C to stop)
#   ./launch_phase_1.sh test       run every scenario non-interactively with assertions
#   ./launch_phase_1.sh test <name>  run assertions for one scenario only
#   ./launch_phase_1.sh list       list scenario names
#
# Scenario configs are generated in a temp dir (Phase 2 will ship real ones).
# Ports used: 9090-9093 (9099 is deliberately left unused for the "down" scenario).

export LC_ALL=C
cd "$(dirname "$0")" || exit 1

BIN=./meshsim
WORK=$(mktemp -d "${TMPDIR:-/tmp}/meshsim-phase1.XXXXXX")
PIDS=()
LAST_PID=""
PASS=0
FAIL=0

SCENARIOS="single chain lb fanout qos failure errorrate down cli validation"

# ---------------------------------------------------------------- plumbing --

stop_all() {
  local p
  for p in ${PIDS[@]:-}; do
    kill "$p" 2>/dev/null
  done
  for p in ${PIDS[@]:-}; do
    wait "$p" 2>/dev/null
  done
  PIDS=()
}

cleanup() {
  stop_all
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'echo; echo "Stopped."; exit 130' INT TERM

build() {
  echo ">> go build ./cmd/meshsim"
  go build -o meshsim ./cmd/meshsim || { echo "build failed"; exit 1; }
}

# start_node <logname> <port> <config-file> [extra flags...]
start_node() {
  local name=$1 port=$2 cfg=$3
  shift 3
  "$BIN" --config "$cfg" "$@" >"$WORK/$name.log" 2>&1 &
  LAST_PID=$!
  PIDS+=("$LAST_PID")
  local i
  for i in $(seq 1 50); do
    curl -s -o /dev/null -m 1 "localhost:$port/count/get" && return 0
    sleep 0.1
  done
  echo "!! $name did not come up on :$port — log:"
  cat "$WORK/$name.log"
  return 1
}

get()  { curl -s -m 5 "$1"; }
post() { curl -s -m 5 -X POST "$1"; }
code() { curl -s -m 5 -o /dev/null -w '%{http_code}' ${2:+-X "$2"} "$1"; }
ms()   { curl -s -m 5 -o /dev/null -w '%{time_total}' "$1" | awk '{printf "%d", $1*1000}'; }

# ------------------------------------------------------------- assertions --

ok()  { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '         %s\n' "$2"; }

has() {   # has <desc> <haystack> <needle>
  case "$2" in *"$3"*) ok "$1" ;; *) bad "$1" "expected to contain: $3" ;; esac
}
hasnt() { # hasnt <desc> <haystack> <needle>
  case "$2" in *"$3"*) bad "$1" "expected NOT to contain: $3" ;; *) ok "$1" ;; esac
}
eq() {    # eq <desc> <actual> <expected>
  [ "$2" = "$3" ] && ok "$1" || bad "$1" "expected '$3', got '$2'"
}
ge() {    # ge <desc> <actual> <min>
  [ "$2" -ge "$3" ] && ok "$1 ($2)" || bad "$1" "expected >= $3, got $2"
}
le() {    # le <desc> <actual> <max>
  [ "$2" -le "$3" ] && ok "$1 ($2)" || bad "$1" "expected <= $3, got $2"
}

# ---------------------------------------------------------- scenario: up ----

up_single() {
  cat >"$WORK/single.yaml" <<EOF
name: "Single"
color: "#3b82f6"
icon: "fa-server"
port: 9090
qos:
  latency_ms: 10
EOF
  start_node single 9090 "$WORK/single.yaml"
}

up_chain() {
  printf '# a comment\n\nHello mesh\n' >"$WORK/quotes.txt"
  printf '# a comment\n\nNimbus Cache | fa-bolt\n' >"$WORK/products.txt"
  printf 'Bare Product\n' >"$WORK/products_bare.txt"
  cat >"$WORK/backend.yaml" <<EOF
name: "Backend"
color: "#b91c1c"
icon: "fa-database"
tag: "v2"
tag_color: "#fbbf24"
tag_icon: "fa-bolt"
port: 9091
counter_enabled: true
quotes_enabled: true
quotes_file: "$WORK/quotes.txt"
products_enabled: true
products_file: "$WORK/products.txt"
EOF
  cat >"$WORK/frontend.yaml" <<EOF
name: "Frontend"
color: "#347a16"
icon: "fa-globe"
port: 9090
ui_refresh_secs: 7
products_enabled: true
products_file: "$WORK/products_bare.txt"
upstreams:
  - name: "Backend"
    port: 9091
EOF
  start_node Backend 9091 "$WORK/backend.yaml" && start_node Frontend 9090 "$WORK/frontend.yaml"
}

up_lb() {
  local i
  for i in 1 2; do
    cat >"$WORK/b$i.yaml" <<EOF
name: "Backend-$i"
port: 909$i
counter_enabled: true
EOF
  done
  cat >"$WORK/lb.yaml" <<EOF
name: "LB"
icon: "fa-shuffle"
port: 9090
round_robin: true
upstreams:
  - name: "Backend-1"
    port: 9091
  - name: "Backend-2"
    port: 9092
EOF
  start_node B1 9091 "$WORK/b1.yaml" || return 1
  start_node B2 9092 "$WORK/b2.yaml" || return 1
  B2_PID=$LAST_PID
  start_node LB 9090 "$WORK/lb.yaml"
}

up_fanout() {
  local i
  for i in 1 2 3; do
    printf 'name: "Svc-%s"\nport: 909%s\n' "$i" "$i" >"$WORK/s$i.yaml"
    start_node "S$i" "909$i" "$WORK/s$i.yaml" || return 1
  done
  cat >"$WORK/fo.yaml" <<EOF
name: "Fanout"
port: 9090
upstreams:
  - { name: "Svc-1", port: 9091 }
  - { name: "Svc-2", port: 9092 }
  - { name: "Svc-3", port: 9093 }
EOF
  start_node Fanout 9090 "$WORK/fo.yaml"
}

up_qos() {
  cat >"$WORK/qos.yaml" <<EOF
name: "Slow"
port: 9090
qos:
  latency_ms: 300
  jitter_ms: 200
EOF
  start_node Slow 9090 "$WORK/qos.yaml"
}

up_failure() {
  cat >"$WORK/flaky.yaml" <<EOF
name: "Flaky"
port: 9091
qos:
  failure_rate: 1.0
EOF
  cat >"$WORK/fe.yaml" <<EOF
name: "Frontend"
port: 9090
upstreams:
  - { name: "Flaky", port: 9091 }
EOF
  start_node Flaky 9091 "$WORK/flaky.yaml" && start_node Frontend 9090 "$WORK/fe.yaml"
}

up_errorrate() {
  printf 'name: "Backend"\nport: 9091\n' >"$WORK/be.yaml"
  cat >"$WORK/fe.yaml" <<EOF
name: "Frontend"
port: 9090
qos:
  error_rate: 1.0
upstreams:
  - { name: "Backend", port: 9091 }
EOF
  start_node Backend 9091 "$WORK/be.yaml" && start_node Frontend 9090 "$WORK/fe.yaml"
}

up_down() {
  cat >"$WORK/fe.yaml" <<EOF
name: "Frontend"
port: 9090
upstreams:
  - { name: "Ghost", port: 9099 }
EOF
  start_node Frontend 9090 "$WORK/fe.yaml"
}

up_cli() {
  printf 'CLI quote\n' >"$WORK/q.txt"
  printf 'CLI Product | fa-key\n' >"$WORK/p.txt"
  printf 'name: "Cli"\nport: 9090\n' >"$WORK/cli.yaml"
  start_node Cli 9090 "$WORK/cli.yaml" \
    --quotes-file "$WORK/q.txt" --products-file "$WORK/p.txt" --counter
}

up_validation() { :; }

# --------------------------------------------------------- scenario: hint ---

hint() {
  case $1 in
  single) cat <<'EOF'
  One node on :9090 with 10ms latency.
    curl localhost:9090/              -> JSON: name, color, icon, address, qos, "upstreams": []
    curl localhost:9090/health        -> {"status":"ok"}
    curl localhost:9090/count/get     -> {"counter":0}   (counter disabled -> 0)
    curl -X POST localhost:9090/count/add -> {"counter":0}  (no counter, no upstreams)
    curl localhost:9090/ui            -> placeholder HTML, `var CONFIG = {"refresh_secs":5};`
    curl -i localhost:9090/ui/app.js  -> application/javascript ; /ui/styles.css -> text/css
    Look at the terminal for one log line per request.
EOF
  ;;
  chain) cat <<'EOF'
  Frontend :9090 -> Backend :9091 (Backend owns counter, quotes, products, tag).
    curl localhost:9090/              -> nested JSON; Backend has quote "Hello mesh",
                                         product "Nimbus Cache"/fa-bolt, "counter", tag v2
                                         (comment and blank lines in data files are ignored)
    curl localhost:9090/              -> Frontend product "Bare Product" gets default icon fa-gear
    curl -X POST localhost:9090/count/add -> {"counter":1}, again -> 2   (fan-out sum)
    curl localhost:9091/count/get     -> {"counter":2}
    curl localhost:9090/count/get     -> {"counter":0}   (this instance only)
    curl localhost:9090/ui            -> {"refresh_secs":7}  (from ui_refresh_secs)
    From another terminal: kill the Backend (`pkill -f backend.yaml`) -> Frontend /health goes 503
                           and Frontend / shows an "error" on the Backend upstream.
EOF
  ;;
  lb) cat <<'EOF'
  LB :9090 (round_robin) -> Backend-1 :9091, Backend-2 :9092 (both with counters).
    for i in 1 2 3 4; do curl -s localhost:9090/ | grep '"name"'; done
                                      -> each response has ONE upstream, alternating 1,2,1,2
    curl -X POST localhost:9090/count/add -> {"counter":2}  (count/add still hits ALL upstreams)
    curl localhost:9090/health        -> 200; stop one backend and it becomes 503 (checks ALL)
EOF
  ;;
  fanout) cat <<'EOF'
  Fanout :9090 -> Svc-1/2/3 on :9091-9093, no round_robin.
    curl localhost:9090/              -> all three upstreams in a single response, in config order
EOF
  ;;
  qos) cat <<'EOF'
  Slow :9090 with latency_ms 300 + jitter_ms 200.
    time curl -s localhost:9090/ >/dev/null   -> 300-500ms
    time curl -s localhost:9090/health        -> instant (health never sleeps)
EOF
  ;;
  failure) cat <<'EOF'
  Frontend :9090 -> Flaky :9091 (failure_rate 1.0).
    curl -i localhost:9091/           -> 500 {"error":"simulated failure","name":"Flaky"}
    curl -i localhost:9091/health     -> 503 degraded
    curl localhost:9090/              -> 200, upstream Flaky has "error": "upstream returned HTTP 500"
    curl -i localhost:9090/health     -> 503 (upstream health propagates)
EOF
  ;;
  errorrate) cat <<'EOF'
  Frontend :9090 (error_rate 1.0) -> Backend :9091 (healthy).
    curl localhost:9090/              -> upstream Backend has "simulated upstream error (error_rate)"
                                         without ever being called (check Backend's log)
    curl localhost:9090/health        -> 200 (error_rate does not affect health)
EOF
  ;;
  down) cat <<'EOF'
  Frontend :9090 -> Ghost :9099 (nothing listening).
    curl localhost:9090/              -> 200, upstream Ghost has an "error" (connection refused)
    curl -i localhost:9090/health     -> 503
    curl -X POST localhost:9090/count/add -> {"counter":0}  (errors count as 0)
EOF
  ;;
  cli) cat <<'EOF'
  Config has no quotes/products/counter; CLI flags --quotes-file, --products-file, --counter enable them.
    curl localhost:9090/              -> quote "CLI quote", product "CLI Product"/fa-key, "counter": 0
    curl -X POST localhost:9090/count/add -> {"counter":1}
EOF
  ;;
  validation) cat <<'EOF'
  Runs a series of invalid configs; each must exit non-zero with a clear message.
EOF
  ;;
  esac
}

# --------------------------------------------------------- scenario: test ---

test_single() {
  local r h
  r=$(get localhost:9090/)
  has   "GET / has name"               "$r" '"name": "Single"'
  has   "GET / has color"              "$r" '"color": "#3b82f6"'
  has   "GET / has icon"               "$r" '"icon": "fa-server"'
  has   "GET / has address"            "$r" '"address": "'
  has   "GET / has qos block"          "$r" '"latency_ms": 10'
  has   "GET / upstreams is []"        "$r" '"upstreams": []'
  hasnt "counter omitted when off"     "$r" '"counter"'
  hasnt "error omitted when none"      "$r" '"error"'
  eq    "GET /health body"             "$(get localhost:9090/health)" '{"status":"ok"}'
  eq    "GET /count/get"               "$(get localhost:9090/count/get)" '{"counter":0}'
  eq    "POST /count/add (no counter)" "$(post localhost:9090/count/add)" '{"counter":0}'
  h=$(get localhost:9090/ui)
  has   "/ui injects config"           "$h" 'var CONFIG = {"refresh_secs":5};'
  hasnt "/ui token fully replaced"     "$h" '__MESHSIM_CONFIG__'
  has   "/ui/app.js content-type"      "$(curl -sI localhost:9090/ui/app.js)" 'application/javascript'
  has   "/ui/styles.css content-type"  "$(curl -sI localhost:9090/ui/styles.css)" 'text/css'
  has   "request logging"              "$(cat "$WORK/single.log")" 'GET / 200'
}

test_chain() {
  local r
  r=$(get localhost:9090/)
  has "nested upstream Backend"        "$r" '"name": "Backend"'
  has "quote (comments skipped)"       "$r" '"quote": "Hello mesh"'
  has "product name"                   "$r" '"product": "Nimbus Cache"'
  has "product icon"                   "$r" '"product_icon": "fa-bolt"'
  has "default product icon"           "$r" '"product_icon": "fa-gear"'
  has "tag fields"                     "$r" '"tag": "v2"'
  has "tag_icon"                       "$r" '"tag_icon": "fa-bolt"'
  has "counter on backend"             "$r" '"counter": 0'
  has "quotes loaded log"              "$(cat "$WORK/Backend.log")" 'Loaded 1 quotes'
  has "upstream log line"              "$(cat "$WORK/Frontend.log")" 'upstream: Backend @ localhost:9091'
  eq  "count/add fan-out #1"           "$(post localhost:9090/count/add)" '{"counter":1}'
  eq  "count/add fan-out #2"           "$(post localhost:9090/count/add)" '{"counter":2}'
  eq  "backend count/get"              "$(get localhost:9091/count/get)" '{"counter":2}'
  eq  "frontend count/get (own only)"  "$(get localhost:9090/count/get)" '{"counter":0}'
  has "counter visible via frontend /" "$(get localhost:9090/)" '"counter": 2'
  eq  "health 200"                     "$(code localhost:9090/health)" 200
  has "ui_refresh_secs honoured"       "$(get localhost:9090/ui)" '{"refresh_secs":7}'
}

test_lb() {
  local r1 r2 r3 r4
  r1=$(get localhost:9090/); r2=$(get localhost:9090/)
  r3=$(get localhost:9090/); r4=$(get localhost:9090/)
  has   "req 1 -> Backend-1"           "$r1" '"name": "Backend-1"'
  hasnt "req 1 only one upstream"      "$r1" '"name": "Backend-2"'
  has   "req 2 -> Backend-2"           "$r2" '"name": "Backend-2"'
  hasnt "req 2 only one upstream"      "$r2" '"name": "Backend-1"'
  has   "req 3 -> Backend-1"           "$r3" '"name": "Backend-1"'
  has   "req 4 -> Backend-2"           "$r4" '"name": "Backend-2"'
  eq    "count/add reaches ALL"        "$(post localhost:9090/count/add)" '{"counter":2}'
  eq    "health 200 (all healthy)"     "$(code localhost:9090/health)" 200
  kill "$B2_PID" 2>/dev/null; wait "$B2_PID" 2>/dev/null
  eq    "health 503 when 1 is down"    "$(code localhost:9090/health)" 503
}

test_fanout() {
  local r
  r=$(get localhost:9090/)
  has "Svc-1 present" "$r" '"name": "Svc-1"'
  has "Svc-2 present" "$r" '"name": "Svc-2"'
  has "Svc-3 present" "$r" '"name": "Svc-3"'
}

test_qos() {
  local t
  t=$(ms localhost:9090/)
  ge "GET / >= latency (300ms)" "$t" 300
  le "GET / <= latency+jitter (+margin)" "$t" 800
  t=$(ms localhost:9090/health)
  le "GET /health does not sleep" "$t" 150
}

test_failure() {
  eq  "Flaky / -> 500"               "$(code localhost:9091/)" 500
  has "Flaky / body"                 "$(get localhost:9091/)" '"error":"simulated failure"'
  eq  "Flaky /health -> 503"         "$(code localhost:9091/health)" 503
  eq  "Frontend / still 200"         "$(code localhost:9090/)" 200
  has "upstream HTTP 500 reported"   "$(get localhost:9090/)" 'upstream returned HTTP 500'
  eq  "Frontend /health -> 503"      "$(code localhost:9090/health)" 503
}

test_errorrate() {
  local r
  r=$(get localhost:9090/)
  has "simulated upstream error"     "$r" 'simulated upstream error (error_rate)'
  has "backend never called"         "$(cat "$WORK/Backend.log")" 'Starting instance'
  hasnt "backend log has no GET /"   "$(grep ' GET / ' "$WORK/Backend.log")" 'GET /'
  eq  "Frontend /health 200"         "$(code localhost:9090/health)" 200
}

test_down() {
  has "upstream error reported"      "$(get localhost:9090/)" '"error": "'
  eq  "/ still 200"                  "$(code localhost:9090/)" 200
  eq  "/health -> 503"               "$(code localhost:9090/health)" 503
  eq  "count/add errors count as 0"  "$(post localhost:9090/count/add)" '{"counter":0}'
}

test_cli() {
  local r
  r=$(get localhost:9090/)
  has "quote from CLI flag"          "$r" '"quote": "CLI quote"'
  has "product from CLI flag"        "$r" '"product": "CLI Product"'
  has "product icon from CLI flag"   "$r" '"product_icon": "fa-key"'
  has "counter from CLI flag"        "$r" '"counter": 0'
  eq  "count/add"                    "$(post localhost:9090/count/add)" '{"counter":1}'
}

# expect_fail <desc> <config-file> <message-substring> — instance must exit non-zero fast
expect_fail() {
  local desc=$1 cfg=$2 msg=$3 out pid rc i
  "$BIN" --config "$cfg" >"$WORK/val.log" 2>&1 &
  pid=$!
  for i in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
    bad "$desc" "instance started although config is invalid"
    return
  fi
  wait "$pid"; rc=$?
  out=$(cat "$WORK/val.log")
  [ "$rc" -ne 0 ] && ok "$desc: exit code $rc" || bad "$desc" "exit code 0"
  has "$desc: message" "$out" "$msg"
}

test_validation() {
  printf 'port: 9090\n'                                        >"$WORK/v1.yaml"
  printf 'name: X\nport: 70000\n'                              >"$WORK/v2.yaml"
  printf 'name: X\nport: 9090\nqos: {failure_rate: 1.5}\n'     >"$WORK/v3.yaml"
  printf 'name: X\nport: 9090\nqos: {error_rate: -0.1}\n'      >"$WORK/v4.yaml"
  printf 'name: X\nport: 9090\nquotes_enabled: true\nquotes_file: /no/such/file\n' >"$WORK/v5.yaml"
  printf 'name: X\nport: 9090\nproducts_enabled: true\nproducts_file: /no/such/file\n' >"$WORK/v6.yaml"
  printf 'name = "X"\n'                                        >"$WORK/v7.hcl"
  printf 'name: [unterminated\n'                               >"$WORK/v8.yaml"
  expect_fail "missing name"          "$WORK/v1.yaml" 'name is required'
  expect_fail "port out of range"     "$WORK/v2.yaml" 'out of range [1, 65535]'
  expect_fail "failure_rate > 1"      "$WORK/v3.yaml" 'qos.failure_rate must be in [0, 1]'
  expect_fail "error_rate < 0"        "$WORK/v4.yaml" 'qos.error_rate must be in [0, 1]'
  expect_fail "missing quotes file"   "$WORK/v5.yaml" 'quotes_file'
  expect_fail "missing products file" "$WORK/v6.yaml" 'products_file'
  expect_fail ".hcl rejected"         "$WORK/v7.hcl"  'HCL config format is not supported'
  expect_fail "malformed YAML"        "$WORK/v8.yaml" 'parsing YAML'
  expect_fail "config file missing"   "$WORK/nope.yaml" 'reading config file'
}

# ----------------------------------------------------------------- driver ---

run_test() {
  local s=$1
  printf '\n\033[1m== %s ==\033[0m\n' "$s"
  if "up_$s"; then
    "test_$s"
  else
    bad "$s: failed to start"
  fi
  stop_all
}

run_interactive() {
  local s=$1
  if [ "$s" = validation ]; then
    hint validation
    test_validation
    return
  fi
  printf '\n\033[1m== %s ==\033[0m\n' "$s"
  "up_$s" || exit 1
  echo "Running. Config files and logs: $WORK"
  hint "$s"
  echo
  echo "Press Ctrl+C to stop."
  wait
}

valid_scenario() {
  case " $SCENARIOS " in *" $1 "*) return 0 ;; *) return 1 ;; esac
}

menu() {
  local i=1 s choice
  echo "meshsim Phase 1 scenarios:"
  for s in $SCENARIOS; do
    printf '  %2d) %s\n' "$i" "$s"
    i=$((i+1))
  done
  printf '   t) run ALL automated tests\n   q) quit\n> '
  read -r choice
  case $choice in
    q|Q|"") exit 0 ;;
    t|T) run_all_tests ;;
    *[!0-9]*) valid_scenario "$choice" && run_interactive "$choice" || { echo "unknown choice"; exit 1; } ;;
    *) i=1
       for s in $SCENARIOS; do
         [ "$i" = "$choice" ] && { run_interactive "$s"; return; }
         i=$((i+1))
       done
       echo "unknown choice"; exit 1 ;;
  esac
}

run_all_tests() {
  local s
  for s in $SCENARIOS; do run_test "$s"; done
  printf '\n\033[1mResult: %d passed, %d failed\033[0m\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ]
}

case "${1:-}" in
  list)
    echo $SCENARIOS ;;
  test)
    build
    if [ -n "${2:-}" ]; then
      valid_scenario "$2" || { echo "unknown scenario: $2"; exit 1; }
      run_test "$2"
      printf '\n\033[1mResult: %d passed, %d failed\033[0m\n' "$PASS" "$FAIL"
      [ "$FAIL" -eq 0 ]
    else
      run_all_tests
    fi ;;
  "")
    build; menu ;;
  *)
    valid_scenario "$1" || { echo "unknown scenario: $1 (try: $0 list)"; exit 1; }
    build; run_interactive "$1" ;;
esac
