package upstream

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"meshsim/internal/config"
	"meshsim/internal/qos"
)

// UpstreamTimeout bounds every outbound call.
const UpstreamTimeout = 3 * time.Second

// NodeResponse is the JSON structure returned by GET / (recursive).
type NodeResponse struct {
	Name        string            `json:"name"`
	Color       string            `json:"color,omitempty"`
	Icon        string            `json:"icon,omitempty"`
	Tag         string            `json:"tag,omitempty"`
	TagColor    string            `json:"tag_color,omitempty"`
	TagIcon     string            `json:"tag_icon,omitempty"`
	Address     string            `json:"address"`
	QoS         *config.QoSConfig `json:"qos,omitempty"`
	Quote       string            `json:"quote,omitempty"`
	Product     string            `json:"product,omitempty"`
	ProductIcon string            `json:"product_icon,omitempty"`
	Counter     *int64            `json:"counter,omitempty"`
	Upstreams   []NodeResponse    `json:"upstreams"`
	Error       string            `json:"error,omitempty"`
}

// QueryAll fans out GET / to all upstreams concurrently.
// If rrIndex is non-nil (round-robin mode), selects only one upstream per call.
func QueryAll(ctx context.Context, ups []config.UpstreamConfig, errRate float64, rrIndex *int64) []NodeResponse {
	if len(ups) == 0 {
		return []NodeResponse{}
	}
	if rrIndex != nil {
		idx := int((atomic.AddInt64(rrIndex, 1) - 1) % int64(len(ups)))
		return []NodeResponse{queryOne(ctx, ups[idx], errRate)}
	}
	results := make([]NodeResponse, len(ups))
	var wg sync.WaitGroup
	for i, up := range ups {
		wg.Add(1)
		go func(idx int, u config.UpstreamConfig) {
			defer wg.Done()
			results[idx] = queryOne(ctx, u, errRate)
		}(i, up)
	}
	wg.Wait()
	return results
}

// queryOne calls GET / on a single upstream.
func queryOne(ctx context.Context, up config.UpstreamConfig, errRate float64) NodeResponse {
	base := NodeResponse{
		Name:      up.Name,
		Address:   fmt.Sprintf("%s:%d", up.Address, up.Port),
		Upstreams: []NodeResponse{},
	}

	if qos.ShouldErrorUpstream(errRate) {
		base.Error = "simulated upstream error (error_rate)"
		return base
	}

	reqCtx, cancel := context.WithTimeout(ctx, UpstreamTimeout)
	defer cancel()

	url := fmt.Sprintf("http://%s:%d/", up.Address, up.Port)
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		base.Error = err.Error()
		return base
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		base.Error = err.Error()
		return base
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		base.Error = fmt.Sprintf("upstream returned HTTP %d", resp.StatusCode)
		return base
	}

	var node NodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&node); err != nil {
		base.Error = fmt.Sprintf("decoding response: %s", err.Error())
		return base
	}
	return node
}

// CheckHealth fans out GET /health concurrently; returns the first error or nil.
func CheckHealth(ctx context.Context, ups []config.UpstreamConfig) error {
	errs := make([]error, len(ups))
	var wg sync.WaitGroup
	for i, up := range ups {
		wg.Add(1)
		go func(idx int, u config.UpstreamConfig) {
			defer wg.Done()
			errs[idx] = checkOne(ctx, u)
		}(i, up)
	}
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

func checkOne(ctx context.Context, up config.UpstreamConfig) error {
	reqCtx, cancel := context.WithTimeout(ctx, UpstreamTimeout)
	defer cancel()

	url := fmt.Sprintf("http://%s:%d/health", up.Address, up.Port)
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("upstream %s returned HTTP %d", up.Name, resp.StatusCode)
	}
	return nil
}

// CallCountAdd calls POST /count/add on one upstream; returns its counter value.
func CallCountAdd(ctx context.Context, up config.UpstreamConfig) (int64, error) {
	reqCtx, cancel := context.WithTimeout(ctx, UpstreamTimeout)
	defer cancel()

	url := fmt.Sprintf("http://%s:%d/count/add", up.Address, up.Port)
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, nil)
	if err != nil {
		return 0, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var body struct {
		Counter int64 `json:"counter"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, err
	}
	return body.Counter, nil
}
