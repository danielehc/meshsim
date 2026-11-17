# meshsim — New Implementation: Master Prompt Index

This file is the **entry point** for all AI coding sessions on the meshsim rewrite.
Read this file first, then open the referenced document for the phase you are implementing.

---

## What is meshsim?

meshsim is a self-contained Go binary that simulates a multi-tier service mesh for demos,
teaching, and observability experiments.  Multiple instances are launched simultaneously,
each with its own YAML config; they call each other over HTTP forming a live topology
(e.g. Frontend → API → Backend).  Any instance serves a browser UI that draws the whole
reachable topology as an interactive node graph.

The existing implementation lives in `../meshsim_old/` and is the canonical reference for
behaviour, JSON shapes, and visual design.  The **new** implementation will be written from
scratch inside this folder (`meshsim/`), preserving all existing functionality while fixing
known weaknesses.

---

## Reference documents

| File | Contents |
|------|----------|
| `planning/TECH.md`  | Technology choices, package structure, key design decisions |
| `planning/UXUI.md`  | UI/UX specification: node card, WebApp overlay, theme, icons |
| `planning/PHASE1.md`| Phase 1 — Go backend core (all internal packages + HTTP server) |
| `planning/PHASE2.md`| Phase 2 — Scenarios (5 config folders) + `run.sh` + `Makefile` |
| `planning/PHASE3.md`| Phase 3 — Browser UI (vanilla JS, embedded SVG icons, `ui/` dir) |
| `planning/PHASE4.md`| Phase 4 — Polish (validation, docs, README, final wiring) |

The old source lives in `../meshsim_old/src/` and configs in `../meshsim_old/configs/`.
Reuse icon choices from `../meshsim_old/docs/Icons.md` and visual ideas from the old UI
at `../meshsim_old/src/ui/index.html`.

---

## Implement in order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

Each phase is self-contained: complete it fully (build passes, code is clean) before
moving to the next.  The phases are designed to fit comfortably in a single coding session
without requiring too much context.

---

## Key decisions (summary — details in TECH.md)

| Topic | Decision |
|-------|----------|
| Language / runtime | Go 1.22, module name `meshsim` |
| Package structure | `internal/` packages (config, store, qos, upstream, server, ui) |
| External deps | `gopkg.in/yaml.v3` only — everything else is stdlib |
| Font Awesome | **Replaced** by an inline SVG icon map (~30 icons, no CDN, no external files) |
| UI files | `ui/` directory embedded via `//go:embed`; separate `index.html`, `styles.css`, `app.js` |
| Config injection | Token replacement: `__MESHSIM_CONFIG__` placeholder in `index.html` |
| Load balancer mode | New `round_robin: true` config key — rotates upstreams on each request |
| Config validation | Fatal at startup: port range, rates [0–1], name non-empty, files exist |
| Cyclic upstreams | Not protected — documented as user responsibility |
| Tests | Out of scope for this rewrite |
| Run script | Single `run.sh` with auto-build + scenario menu |

---

## Scenarios to implement (Phase 2)

| Folder | Instances | Ports |
|--------|-----------|-------|
| `configs/monolith/` | Frontend (all features) | 8080 |
| `configs/two-tier/` | Frontend + Backend | 8080, 8081 |
| `configs/three-tier/` | Frontend + AppLogic + Backend | 8080, 8081, 8082 |
| `configs/microservices/` | Frontend + Quotes + Products + Payment + Backend | 8080–8084 |
| `configs/replication/` | LoadBalancer + 2×Frontend + 2×AppLogic + 2×Backend | 8080–8086 |

---

## Non-goals

- No automated tests (can be added later).
- No Docker / container support.
- No cycle/loop detection in upstream fan-out.
- No TLS or authentication.
