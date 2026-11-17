# meshsim — Icon Reference

Icons are rendered using inline SVG paths extracted from
[Font Awesome 6 Free](https://fontawesome.com/icons) (Solid style, SIL OFL 1.1).
**No CDN or external dependency** — all paths are bundled in the binary.

Set the `icon` field in your config to any value from the **Config value** column.
The `fa-` prefix is optional (`gear` and `fa-gear` are both accepted).

```yaml
name: "My Service"
icon: "fa-server"
```

Unknown icon names fall back to `fa-gear`.

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

```yaml
tag: "v2"
tag_color: "#4ade80"
tag_icon: "fa-bookmark"
```
