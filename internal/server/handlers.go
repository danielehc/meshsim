package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sync"

	"meshsim/internal/config"
	"meshsim/internal/counter"
	"meshsim/internal/qos"
	"meshsim/internal/store"
	"meshsim/internal/upstream"
	"meshsim/ui"
)

// App holds the application state shared across handlers.
type App struct {
	Cfg      *config.Config
	Hostname string
	Quotes   *store.QuoteStore   // nil if not enabled
	Products *store.ProductStore // nil if not enabled
	Counter  *counter.Counter    // nil if not enabled
	RRIndex  int64               // atomic round-robin cursor
}

// NewApp builds an App; the counter is created when cfg.CounterEnabled is set.
func NewApp(cfg *config.Config, hostname string, quotes *store.QuoteStore, products *store.ProductStore) *App {
	app := &App{Cfg: cfg, Hostname: hostname, Quotes: quotes, Products: products}
	if cfg.CounterEnabled {
		app.Counter = &counter.Counter{}
	}
	return app
}

// handleRoot handles GET /
func (a *App) handleRoot(w http.ResponseWriter, r *http.Request) {
	if qos.ApplyQoS(a.Cfg.QoS) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error":"simulated failure","name":%q}`, a.Cfg.Name)
		return
	}

	var rrPtr *int64
	if a.Cfg.RoundRobin {
		rrPtr = &a.RRIndex
	}
	ups := upstream.QueryAll(r.Context(), a.Cfg.Upstreams, a.Cfg.QoS.ErrorRate, rrPtr)

	node := upstream.NodeResponse{
		Name:      a.Cfg.Name,
		Color:     a.Cfg.Color,
		Icon:      a.Cfg.Icon,
		Tag:       a.Cfg.Tag,
		TagColor:  a.Cfg.TagColor,
		TagIcon:   a.Cfg.TagIcon,
		Address:   fmt.Sprintf("%s:%d", a.Hostname, a.Cfg.Port),
		QoS:       &a.Cfg.QoS,
		Upstreams: ups,
	}
	if a.Quotes != nil {
		node.Quote = a.Quotes.Random()
	}
	if a.Products != nil {
		p := a.Products.Random()
		node.Product = p.Name
		node.ProductIcon = p.Icon
	}
	if a.Counter != nil {
		v := a.Counter.Get()
		node.Counter = &v
	}

	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(node)
}

// handleHealth handles GET /health
func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if fr := a.Cfg.QoS.FailureRate; fr > 0 && rand.Float64() < fr {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, `{"status":"degraded","reason":"simulated failure (failure_rate=%.2f)"}`, fr)
		return
	}
	if err := upstream.CheckHealth(r.Context(), a.Cfg.Upstreams); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, `{"status":"degraded","reason":%q}`, err.Error())
		return
	}
	fmt.Fprint(w, `{"status":"ok"}`)
}

// handleCountGet handles GET /count/get
func (a *App) handleCountGet(w http.ResponseWriter, r *http.Request) {
	var val int64
	if a.Counter != nil {
		val = a.Counter.Get()
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"counter":%d}`, val)
}

// handleCountAdd handles POST /count/add.
// If this instance owns a counter it is incremented; otherwise the call is
// fanned out to all upstreams and the sum is returned (errors count as 0).
func (a *App) handleCountAdd(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if a.Counter != nil {
		fmt.Fprintf(w, `{"counter":%d}`, a.Counter.Add())
		return
	}

	type result struct {
		val int64
		err error
	}
	results := make([]result, len(a.Cfg.Upstreams))
	var wg sync.WaitGroup
	for i, up := range a.Cfg.Upstreams {
		wg.Add(1)
		go func(idx int, u config.UpstreamConfig) {
			defer wg.Done()
			results[idx].val, results[idx].err = upstream.CallCountAdd(r.Context(), u)
		}(i, up)
	}
	wg.Wait()

	var total int64
	for _, res := range results {
		if res.err == nil {
			total += res.val
		}
	}
	fmt.Fprintf(w, `{"counter":%d}`, total)
}

// handleUI handles GET /ui.
func (a *App) handleUI(w http.ResponseWriter, r *http.Request) {
	page, err := ui.FS.ReadFile("index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	cfgJSON, err := json.Marshal(map[string]any{"refresh_secs": a.Cfg.UIRefreshSecs})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	page = bytes.Replace(page, []byte("__MESHSIM_CONFIG__"), cfgJSON, 1)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(page)
}

// handleUIAsset serves a named file from the embedded UI FS.
func (a *App) handleUIAsset(name, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := ui.FS.ReadFile(name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", contentType)
		_, _ = w.Write(data)
	}
}
