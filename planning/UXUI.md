# meshsim — UI/UX Specification

> Referenced by: `PROMPT.md`  
> Used in: Phase 3  
> Visual reference: `../meshsim_old/src/ui/index.html` and `../meshsim_old/docs/ui_example.png`

---

## 1. Overall layout

```
┌────────────────────────────────────────────────────────┐
│  Status bar (40px, coloured by root node)              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────┐   SVG canvas (fills remaining height)   │
│  │ WebApp   │                                          │
│  │ overlay  │   Node graph: pan, zoom, drag nodes      │
│  │ (232px)  │                                          │
│  └──────────┘                                          │
└────────────────────────────────────────────────────────┘
```

- The status bar is `position: sticky` at top, `height: 40px`.
- The canvas area fills the rest of the viewport; `overflow: hidden`.
- The WebApp overlay is `position: absolute; left: 8px; top: 8px; z-index: 5`.
  It is hidden by default and shown only when the topology contains quote, product,
  or counter data.

---

## 2. Theme system

### Dark theme (default)

```css
:root {
  --bg:          #0f1117;
  --surface:     #1a1d27;
  --border:      #2d3148;
  --text:        #e2e8f0;
  --text-muted:  #64748b;
  --accent:      #a5b4fc;
  --edge:        #4b5563;
  --btn-hover:   #2d3148;
  --node-bg:     #1e2235;
  --node-border: #2d3148;
  --node-addr:   #64748b;
  --node-dim:    #94a3b8;
  --node-qos:    #475569;
  --node-qdiv:   #2d3148;
}
```

### Light theme

```css
[data-theme="light"] {
  --bg:          #f1f5f9;
  --surface:     #ffffff;
  --border:      #cbd5e1;
  --text:        #1e293b;
  --text-muted:  #64748b;
  --accent:      #4f46e5;
  --edge:        #94a3b8;
  --btn-hover:   #e2e8f0;
  --node-bg:     #ffffff;
  --node-border: #cbd5e1;
  --node-addr:   #64748b;
  --node-dim:    #475569;
  --node-qos:    #94a3b8;
  --node-qdiv:   #e2e8f0;
}
```

Theme follows OS preference on load (`prefers-color-scheme`).  
A manual toggle (sun ☼ / moon ☾) in the status bar overrides it.  
Once overridden, OS changes no longer switch the theme.

---

## 3. Status bar

```
[ ⬡ meshsim ] [ ↺ Refresh ]  [☼ ◯ ☾]   Last update: HH:MM:SS
```

- Background colour: root node's `color` (e.g. `#347a16` for green frontend).
  On first load uses `#1a1d27` as placeholder.
- `h1`: "⬡ meshsim" — hex glyph `U+2B21` + text, 14px, white, 600 weight.
- Refresh button: ghost button, white border at 35% opacity, 11px.
- Theme toggle: sun icon + track + moon icon; track slides based on current theme.
- Last update: right-aligned, "Last update: " + `<span>` showing `toLocaleTimeString()`.

---

## 4. Node card (updated — 210 × 120 px)

The card is **120px tall** (up from 108px in the old app) to give QoS info more room.  
Banner remains **30px tall** at the top.

```
┌─────────────────────────────────────────┐  ← rounded corners (rx=8)
│ [icon] Name                  [counter]  │  ← 30px banner (node colour)
├─────────────────────────────────────────┤
│ address:port                            │  ← monospace, 10px
│ ● healthy / ✕ unreachable               │  ← status: green dot or RED BORDER
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← thin divider
│ latency 0ms · jitter 0ms               │  ← monospace, 9px, muted
│ fail 0% · err 0%                        │  ← monospace, 9px, muted
│                                   [tag] │  ← tag: icon + label, bottom-right
└─────────────────────────────────────────┘
```

### Error state (new)

When `node.error` is non-empty:
- **Red border** (2px solid `#f87171`) replaces the normal `--node-border` border.
- Status line shows `✕ unreachable` in `#f87171`.
- Status dot is `#f87171`.
- Banner colour is still the node's `color` (may be grey `#6b7280` for unknown nodes).

### Counter box (top-right, inside banner)

- Size: 50×50px, positioned 8px from right and top edges of card (partially overlapping banner).
- Fill: `#e5e7eb` (light grey), border: node colour, 1.5px, rx=7.
- Font: system sans-serif, 900 weight.  Scale: 1–2 digits → 28px; 3 digits → 20px; 4+ → 15px.
- Shown only when `counter > 0`.

### Tag (bottom-right)

- Shown only when `tag` is non-empty.
- Monospace, 10px, 700 weight, coloured by `tag_color` (defaults to node `color`).
- Preceded by a tag icon (FA glyph or filled circle if `tag_icon` is omitted).

### Icon in banner

- SVG `<path>` using the inline SVG icon map (see §8).
- Positioned at x=11, y=BANNER_H−8 (bottom-left of banner).
- White, 12px equivalent.

### Layout constants (JavaScript)

```js
var CARD_W   = 210;
var CARD_H   = 120;   // updated from 108
var BANNER_H = 30;
var H_GAP    = 40;
var V_GAP    = 80;
var PAD_X    = 60;
var PAD_Y    = 50;
```

---

## 5. Graph layout

- Nodes are ranked by BFS depth from the root: root at top (depth 0), leaves at bottom.
- Within a rank, nodes are centred horizontally.
- Edges: cubic Bézier curves from the bottom-centre of the parent card to the top-centre
  of the child card, with a dot at the child end (SVG `<marker>`).
- Edge colour: `--edge` CSS variable.
- Pan: drag the canvas background.
- Zoom: mouse wheel (scale range 0.15 – 4.0, step factor 0.9/1.1).
- Node drag: mousedown on a card → move card; position persists across refreshes
  (stored in `nodePos{}` keyed by `name|address`).

---

## 6. WebApp overlay

Shown when any node in the topology tree has a non-empty `quote`, `product`, or `counter`.

```
┌──────────────────────────┐  232px wide
│ ● ● ● Microservices App  │  32px titlebar (node colour)
├──────────────────────────┤
│                          │
│    [product icon 57px]   │  209px product area (#1f2937)
│    Product Name          │
│                          │
├──────────────────────────┤
│  "Quote text goes here   │  210px quote area (#0f172a)
│   in italic style…"      │
│                          │
├──────────────────────────┤
│    [ 💲 Buy ]            │  44px footer (#111827)
└──────────────────────────┘
```

- **Traffic-light dots**: red `#ef4444`, amber `#f59e0b`, green `#22c55e`.
- **Title** (`#wa-title`): 9px, white, taken from root node name if known.
- **Product icon**: inline `<svg>` 57px, amber `#f59e0b`.
- **Product name**: 17px, 700 weight, amber.
- **Quote**: 12px italic, `#94a3b8`, centred, padding 14px 16px.
- **Buy button**: shown only when a counter node exists; rounded pill, 7px 18px padding,
  fires `POST /count/add` (relative URL), flashes "Done!" for 1 second, then re-renders.
- When no counter exists, the footer is hidden entirely (not just the button).
- Product and quote are picked at random from the collected topology data on each render.

---

## 7. Error banner

- `position: absolute; top: 10px; left: 50%; transform: translateX(-50%)`.
- Background `#7f1d1d`, border `#f87171`, text `#fca5a5`, 12px.
- Shown when `GET /` fetch fails; hidden on success.

---

## 8. Inline SVG icon system

Font Awesome is **not loaded**.  Icons are drawn using SVG `<path>` elements with
pre-extracted path data.

### In topology node cards (pure SVG context)

```js
var SVG_ICONS = {
  'fa-gear':    '<path d="..." fill="currentColor"/>',
  'fa-server':  '<path d="..." fill="currentColor"/>',
  // … one entry per icon
};

function iconSVGGroup(iconName, x, y, size, color) {
  // returns a <g transform="translate(x,y) scale(size/512)">
  //           containing the <path> elements
}
```

- All paths use the FA 6 Free Solid viewBox (512×512).
- Scale factor converts the 512-unit viewBox to the desired pixel size.
- `fill` is set explicitly on the group (not `currentColor`) since SVG in HTML doesn't
  inherit `color` the same way.

### In HTML overlays (WebApp panel product icon)

```html
<svg width="57" height="57" viewBox="0 0 512 512" id="wa-product-icon">
  <!-- path injected by JS -->
</svg>
```

JavaScript updates the `innerHTML` of `#wa-product-icon` on each render.

### Normalisation

```js
function normIcon(raw) {
  var key = (raw || 'fa-gear').trim().split(/\s+/).pop();
  if (!key.startsWith('fa-')) key = 'fa-' + key;
  return SVG_ICONS[key] ? key : 'fa-gear';  // fall back to gear
}
```

### Required icons (from old docs/Icons.md + WebApp panel)

```
fa-gear          fa-server        fa-database      fa-globe
fa-box           fa-box-open      fa-shuffle       fa-cloud
fa-linux         fa-windows       fa-plug          fa-lock
fa-bolt          fa-key           fa-layer-group   fa-hard-drive
fa-chart-line    fa-network-wired fa-spider        fa-puzzle-piece
fa-satellite-dish fa-envelope     fa-dharmachakra  fa-terminal
fa-copy          fa-circle        fa-bookmark      fa-tag
fa-dollar-sign
```

All path data must be taken from Font Awesome 6 Free Solid (SIL OFL 1.1 licence for icons).

---

## 9. Fetch & render cycle

```
boot (50ms delay)
  └─ fetchAndRender()
       ├─ fetch('/')
       ├─ on success:
       │    render(data)          ← rebuild SVG nodes + edges
       │    updateWebappNode(data) ← show/hide overlay, update content
       │    tint statusbar
       │    update timestamp
       │    hide error banner
       └─ on error:
            show error banner
       └─ scheduleRefresh(REFRESH_SECS)  ← always, success or failure
```

- Only one timer exists at a time (`clearTimeout` before scheduling next).
- Manual refresh: cancel timer + call `fetchAndRender()` immediately.
- `REFRESH_SECS` comes from the injected `CONFIG.refresh_secs`.

---

## 10. Accessibility & browser support

- Works in Chrome and Firefox (current versions).
- No keyboard navigation required (demo tool, not a product UI).
- `lang="en"` on `<html>`.
- Colour contrast: white text on coloured banners — node colours should be chosen by
  scenario authors to ensure reasonable contrast (not enforced programmatically).

---

## 11. File structure under `ui/`

```
ui/
├── index.html    ← HTML shell; references ./styles.css and ./app.js
├── styles.css    ← all CSS: theme tokens, status bar, canvas, cards, overlay, error
└── app.js        ← all JS: constants, state, SVG_ICONS map, parse/layout/render,
                              WebApp logic, fetch cycle, drag/pan/zoom
```

`index.html` contains the config injection point:

```html
<script>
var CONFIG = __MESHSIM_CONFIG__;
</script>
```

This block appears **before** the `<script src="./app.js">` tag so `CONFIG` is defined
when `app.js` runs.
