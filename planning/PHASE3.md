# meshsim — Phase 3: Browser UI

> **Goal**: a fully working browser UI served from the embedded `ui/` directory.
> Replaces the Phase 1 placeholder.  After this phase, opening `http://localhost:808x/ui`
> in a browser shows the live node graph with all interactions working.
>
> **Read first**: `UXUI.md` for the complete visual specification; `TECH.md` §6 (icon system)
> and §7 (file serving).  
> **Reference**: `../meshsim_old/src/ui/index.html` — copy the overall structure and logic,
> but update as specified here (no CDN, new icon system, taller cards, red border error state).

---

## 0. Prerequisites

- Phase 1 complete and compiling.
- Phase 2 complete: scenarios exist and `run.sh` works.

---

## 1. Files to create / replace

Replace the Phase 1 placeholder files:

```
ui/index.html    ← full HTML shell
ui/styles.css    ← all CSS
ui/app.js        ← all JavaScript
```

After editing these files, run `make build` to re-embed them in the binary.

---

## 2. `ui/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>meshsim</title>
<link rel="stylesheet" href="./styles.css"/>
<!-- Config injected by Go handler — must appear before app.js -->
<script>
var CONFIG = __MESHSIM_CONFIG__;
</script>
</head>
<body>

<!-- Status bar -->
<div id="statusbar">
  <h1>&#x2B21; meshsim</h1>
  <button id="refresh-btn">&#x21BA; Refresh</button>
  <label class="tog" title="Toggle light / dark mode">
    <span>&#x263C;</span>
    <div class="tog-track" id="tog-track"><div class="tog-thumb"></div></div>
    <span>&#x263D;</span>
  </label>
  <div id="last-update">Last update: <span id="ts">&#x2014;</span></div>
</div>

<!-- Graph canvas -->
<div id="canvas-wrap">
  <div id="err"></div>

  <!-- WebApp overlay — shown/hidden by JS -->
  <div id="webapp-node">
    <div id="wa-titlebar">
      <div class="wa-dots">
        <div class="wa-dot" style="background:#ef4444"></div>
        <div class="wa-dot" style="background:#f59e0b"></div>
        <div class="wa-dot" style="background:#22c55e"></div>
      </div>
      <span id="wa-title">Microservices App</span>
    </div>
    <div id="wa-product">
      <svg id="wa-product-icon" width="57" height="57" viewBox="0 0 512 512"></svg>
      <div id="wa-product-name">Company Product</div>
    </div>
    <div id="wa-desc">
      <p id="wa-desc-text">No product description.</p>
    </div>
    <div id="wa-footer">
      <button id="wa-btn">
        <svg width="12" height="12" viewBox="0 0 512 512" id="wa-btn-icon" style="vertical-align:middle;margin-right:4px"></svg>
        <span id="wa-btn-text">Buy</span>
      </button>
    </div>
  </div>

  <svg id="diagram" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="dot-end" markerWidth="10" markerHeight="10"
              refX="5" refY="5" orient="auto">
        <circle id="marker-dot" cx="5" cy="5" r="3.5" fill="#4b5563"/>
      </marker>
    </defs>
    <g id="scene">
      <g id="edges-layer"></g>
      <g id="nodes-layer"></g>
    </g>
  </svg>
</div>

<script src="./app.js"></script>
</body>
</html>
```

Key changes from the old app:
- No `<link>` to Font Awesome CDN.
- `#wa-product-icon` is now an `<svg>` element (not `<i class="fa-solid …">`).
- `#wa-btn-icon` is an inline `<svg>` (replaces the FA dollar sign icon).
- `CONFIG` is injected via token replacement.
- `app.js` is a separate file loaded via `<script src>`.

---

## 3. `ui/styles.css`

Copy the CSS from the old `index.html` (`<style>` block, lines 12–235) into this file.
Make the following changes:

### Updated card height

```css
/* Node cards are 120px tall (was 108px) — no CSS change needed here;
   CARD_H is a JS constant. But if any CSS uses a magic 108 number, update it. */
```

### WebApp overlay — use `<svg>` for product icon instead of FA class

Remove any CSS that targeted `#wa-product-icon` as an `<i>` element.
The `<svg>` element already respects `width`/`height` attributes.

```css
#wa-product-icon {
  display: block;
  color: var(--wa-product-color);  /* not used for SVG fill, set inline by JS */
}
```

### Error state for node cards

No extra CSS needed; the red border is applied inline via SVG attributes in `app.js`.

### Remove the CDN `<link>` reference

The old CSS had no CDN reference in the `<style>` block, so no change needed here.

### Full CSS to include

Copy verbatim from `../meshsim_old/src/ui/index.html` lines 12–235, then apply the
minor tweaks above.  Keep all CSS variables, status bar, toggle, graph canvas,
webapp overlay, and error banner styles intact.

---

## 4. `ui/app.js`

Copy the JavaScript from the old `index.html` (`<script>` block, lines 294–908)
into this file.  Apply all of the following changes:

### 4.1 CONFIG variable (already handled in index.html)

Remove the old injection line:
```js
// OLD — remove this:
var REFRESH_SECS = (typeof __REFRESH_SECS__ !== 'undefined') ? __REFRESH_SECS__ : 5;
```

Replace with:
```js
var REFRESH_SECS = (CONFIG && CONFIG.refresh_secs) ? CONFIG.refresh_secs : 5;
```

### 4.2 Replace FA_GLYPHS with SVG_ICONS

Remove the entire `FA_GLYPHS` object and `faGlyph()` function.
Replace with the `SVG_ICONS` map and helper functions described in §5 below.

### 4.3 Updated CARD_H

```js
var CARD_W   = 210;
var CARD_H   = 120;   // was 108
var BANNER_H = 30;
var H_GAP    = 40;
var V_GAP    = 80;
var PAD_X    = 60;
var PAD_Y    = 50;
```

### 4.4 Updated `buildCard` function

The card is now 120px tall.  Update all `y` offsets that were relative to the old
108px height.  Specifically:

The body/banner/border rectangles use `CARD_H` which is now 120 — no literal changes needed.

The content inside the card needs reflow:

```
BANNER_H = 30
Content rows (y offsets from top of card):
  Address text:        y = BANNER_H + 16 = 46
  Status dot:          cy = BANNER_H + 30 = 60
  Status label:        y = BANNER_H + 34 = 64
  QoS divider:         y1=y2 = BANNER_H + 46 = 76   (was 42 — more breathing room)
  QoS line 1 (lat/jit):y = BANNER_H + 60 = 90        (was 54)
  QoS line 2 (fail/err):y = BANNER_H + 74 = 104       (was 66)
  Tag (bottom-right):  y = CARD_H - 10 = 110          (was 98)
```

### 4.5 Error state: red border

In `buildCard`, replace the border `rect` with conditional logic:

```js
// Border — red if error, normal otherwise
var borderColor = node.status === 'error' ? '#f87171' : C.nodeBorder;
var borderWidth = node.status === 'error' ? '2' : '1';
var bord = se('rect');
attrs(bord, {
  x: 0.5, y: 0.5,
  width: CARD_W - 1, height: CARD_H - 1,
  rx: 7.5, ry: 7.5,
  fill: 'none',
  stroke: borderColor,
  'stroke-width': borderWidth
});
g.appendChild(bord);
```

Also update the status dot and label:
```js
var ok  = node.status !== 'error';
var dotColor = ok ? '#4ade80' : '#f87171';
// (status label stays as before: 'healthy' or 'unreachable')
```

### 4.6 Replace icon rendering in buildCard

Remove the old `<text>` element that used Font Awesome font-family to render the glyph.
Replace with an SVG `<g>` containing the icon path:

```js
// Icon in banner (top-left)
var icoG = iconGroup(node.icon, 10, 8, 14, 'rgba(255,255,255,0.9)');
if (icoG) g.appendChild(icoG);
```

Where `iconGroup(iconName, x, y, size, fill)` is defined in §5.

### 4.7 Replace tag icon rendering

Tags used Font Awesome glyphs for non-circle icons.  Replace with SVG paths:

```js
if (tIcon !== 'fa-circle') {
  var tIcoG = iconGroup(tIcon, tX - 28, tY - 10, 10, tCol);
  if (tIcoG) g.appendChild(tIcoG);
}
```

### 4.8 Update WebApp overlay icon rendering

In `updateWebappNode`:

```js
// Product icon — update the <svg> element's innerHTML
var svgEl = document.getElementById('wa-product-icon');
var pathData = SVG_ICONS[normIcon(prod.icon)];
svgEl.innerHTML = pathData
  ? '<path d="' + extractPath(pathData) + '" fill="#f59e0b"/>'
  : '';

// Buy button icon (dollar sign)
var btnIcon = document.getElementById('wa-btn-icon');
var dollarPath = SVG_ICONS['fa-dollar-sign'];
btnIcon.innerHTML = dollarPath
  ? '<path d="' + extractPath(dollarPath) + '" fill="#ffffff"/>'
  : '';
```

(See `extractPath` helper in §5.)

### 4.9 Keep all other logic unchanged

The following sections should be copied verbatim from the old app (no changes needed):
- `parseTopology(root)` and `nodeId(n)`
- `assignPositions(nodeMap, ranks)`
- `render(data)` — except call updated `buildCard`
- `collectQuotes(node)`, `collectProducts(node)`, `shouldShowWebapp(node)`, `hasCounterNode(node)`
- `updateWebappNode(data)` — except icon rendering (§4.8)
- Buy button click handler (uses `/count/add` relative URL — unchanged)
- `fetchAndRender()` and `scheduleRefresh()`/`manualRefresh()`
- Drag / pan / zoom event handlers and `applyXform()`
- `hexToRgba()`, `clip()`, `pct()`
- Theme system (`applyTheme`, `mq`, toggle listener)
- Boot defer `setTimeout(fetchAndRender, 50)`

---

## 5. SVG icon system (add to `ui/app.js`)

### 5.1 `SVG_ICONS` map

Add this object near the top of `app.js`.  Each value is the complete `<path ...>`
element(s) as a string (the entire SVG content, not just the `d` attribute).  
The viewBox for all Font Awesome 6 Solid icons is `0 0 512 512`.

```js
// SVG path data for Font Awesome 6 Free Solid icons.
// viewBox: 0 0 512 512 for all entries.
// Source: Font Awesome 6 Free (SIL OFL 1.1)
var SVG_ICONS = {
  'fa-gear':            '<path fill="currentColor" d="M..."/>',
  'fa-server':          '<path fill="currentColor" d="M..."/>',
  'fa-database':        '<path fill="currentColor" d="M..."/>',
  'fa-globe':           '<path fill="currentColor" d="M..."/>',
  'fa-box':             '<path fill="currentColor" d="M..."/>',
  'fa-box-open':        '<path fill="currentColor" d="M..."/>',
  'fa-shuffle':         '<path fill="currentColor" d="M..."/>',
  'fa-cloud':           '<path fill="currentColor" d="M..."/>',
  'fa-plug':            '<path fill="currentColor" d="M..."/>',
  'fa-lock':            '<path fill="currentColor" d="M..."/>',
  'fa-bolt':            '<path fill="currentColor" d="M..."/>',
  'fa-key':             '<path fill="currentColor" d="M..."/>',
  'fa-layer-group':     '<path fill="currentColor" d="M..."/>',
  'fa-hard-drive':      '<path fill="currentColor" d="M..."/>',
  'fa-chart-line':      '<path fill="currentColor" d="M..."/>',
  'fa-network-wired':   '<path fill="currentColor" d="M..."/>',
  'fa-spider':          '<path fill="currentColor" d="M..."/>',
  'fa-puzzle-piece':    '<path fill="currentColor" d="M..."/>',
  'fa-satellite-dish':  '<path fill="currentColor" d="M..."/>',
  'fa-envelope':        '<path fill="currentColor" d="M..."/>',
  'fa-dharmachakra':    '<path fill="currentColor" d="M..."/>',
  'fa-terminal':        '<path fill="currentColor" d="M..."/>',
  'fa-copy':            '<path fill="currentColor" d="M..."/>',
  'fa-circle':          '<path fill="currentColor" d="M..."/>',
  'fa-bookmark':        '<path fill="currentColor" d="M..."/>',
  'fa-tag':             '<path fill="currentColor" d="M..."/>',
  'fa-dollar-sign':     '<path fill="currentColor" d="M..."/>',
  'fa-linux':           '<path fill="currentColor" d="M..."/>',
  'fa-windows':         '<path fill="currentColor" d="M..."/>'
};
```

**Important**: The AI implementing this phase must look up the actual SVG path `d`
attribute data for each icon from the Font Awesome 6 Free Solid set.  The `M...`
placeholders above are intentional — they must be replaced with real path data.

The path data can be found by:
1. Downloading the Font Awesome 6 Free source (GitHub: `FortAwesome/Font-Awesome`)
   and extracting from the `svgs/solid/` folder.
2. Or fetching from the CDN: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/svgs/solid/<name>.svg`
   and extracting the `d` attribute.

For `fa-linux` and `fa-windows` (brand icons), use the `svgs/brands/` source.

### 5.2 Helper functions

```js
// Normalise an icon name: strip prefix junk, ensure fa- prefix, fall back to fa-gear.
function normIcon(raw) {
  var key = (raw || 'fa-gear').trim().split(/\s+/).pop();
  if (!key.startsWith('fa-')) key = 'fa-' + key;
  return SVG_ICONS[key] ? key : 'fa-gear';
}

// Extract the 'd' attribute value from an SVG path string like '<path d="M..." .../>'.
// Returns empty string if not found.
function extractPath(svgStr) {
  var m = svgStr.match(/\bd="([^"]+)"/);
  return m ? m[1] : '';
}

// Build an SVG <g> element containing the icon, scaled to `size` pixels,
// positioned with its top-left at (x, y).
// Returns the <g> element, or null if the icon is not found.
function iconGroup(iconName, x, y, size, fill) {
  var key = normIcon(iconName);
  var svgStr = SVG_ICONS[key];
  if (!svgStr) return null;

  var d = extractPath(svgStr);
  if (!d) return null;

  var scale = size / 512;
  var g = se('g');
  g.setAttribute('transform',
    'translate(' + x + ',' + y + ') scale(' + scale + ')');

  var path = se('path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill || 'currentColor');
  g.appendChild(path);

  return g;
}
```

---

## 6. Go handler update (internal/server/handlers.go)

The `handleUIAsset` helper was specified in Phase 1.  Verify it reads from `uiFS`
correctly.  In `handleUI`, the replacement:

```go
// In handlers.go
func (a *App) handleUI(w http.ResponseWriter, r *http.Request) {
    data, err := uiFS.ReadFile("ui/index.html")
    if err != nil {
        http.Error(w, "UI not available", http.StatusInternalServerError)
        return
    }
    cfg := fmt.Sprintf(`{"refresh_secs":%d}`, a.Cfg.UIRefreshSecs)
    page := bytes.ReplaceAll(data, []byte("__MESHSIM_CONFIG__"), []byte(cfg))
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.Write(page)
}
```

`uiFS` must be accessible from `handlers.go`.  Since both files are in `internal/server/`,
declare `uiFS` in `server.go` and it is visible within the package.

---

## 7. Acceptance criteria for Phase 3

1. `make build` succeeds.
2. Launch the monolith scenario:
   ```sh
   ./meshsim --config configs/monolith/frontend.yaml
   ```
3. Open `http://localhost:8080/ui` in a browser.  Verify:
   - The node graph loads with the "Monolith" node visible.
   - The node card is 120px tall with all fields (address, status dot, QoS rows, counter).
   - The WebApp overlay appears with a product icon, quote, and Buy button.
   - Clicking Buy increments the counter on the node card.
   - The statusbar background matches the node's purple `#6b21a8` colour.
   - Dark/light theme toggle works.
   - Auto-refresh updates the timestamp every 5 seconds.
4. Launch the microservices scenario and open any `/ui`:
   - The full topology renders with 5 nodes at 2 depth levels.
   - No Font Awesome CDN request appears in the browser network tab.
5. Launch the replication scenario:
   - The LoadBalancer node shows only one upstream in the diagram (round-robin effect).
   - Multiple manual refreshes show the upstream alternating between Frontend_1 and Frontend_2.
6. Test error state: temporarily set `failure_rate: 1.0` on any upstream.
   That upstream's node card should show a red border and "✕ unreachable" status.

---

## 8. Notes & pitfalls

- The `go:embed` directive in `server.go` embeds the `ui/` directory at build time.
  After editing `ui/` files, you **must** run `make build` (or `go build`) for changes
  to take effect in the running binary.
- The `iconGroup` function positions the top-left of the 512-unit viewBox at `(x, y)`.
  Since FA icons don't fill the full 512×512 box, there may be whitespace.  For the
  banner icon (size=14), adjust `y` visually if it looks misaligned.
- `extractPath` only grabs the first `d="..."` attribute. Icons with multiple paths
  (some FA icons have two `<path>` elements) should have both `d` values concatenated
  with a space in the SVG_ICONS entry, using a single `<path>`.  Alternatively, store
  them as two `<path>` elements and update `iconGroup` to parse both.
- For the WebApp overlay, `svgEl.innerHTML = ...` requires the SVG element to be in
  the regular HTML document (it is — `index.html` embeds it directly).  This differs
  from SVG elements created with `createElementNS` in the main diagram.
- `fa-linux` and `fa-windows` are brand icons.  Their path data comes from
  `svgs/brands/` in the FA source, not `svgs/solid/`.  They still work fine in an
  SVG `<path>` element.
- The `CONFIG` variable must be defined before `app.js` runs.  In `index.html`, the
  inline `<script>` block with the token appears before `<script src="./app.js">`.
  Do not reorder these tags.
