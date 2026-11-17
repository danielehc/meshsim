// Package ui embeds the browser UI assets.
package ui

import "embed"

// FS holds index.html, styles.css and app.js.
//
//go:embed index.html styles.css app.js
var FS embed.FS
