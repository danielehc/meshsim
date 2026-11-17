package qos

import (
	"math/rand"
	"time"

	"meshsim/internal/config"
)

// ApplyQoS sleeps the configured latency+jitter and returns true if the
// failure rate fires (caller should then return HTTP 500).
func ApplyQoS(cfg config.QoSConfig) (shouldFail bool) {
	sleep := cfg.LatencyMs
	if cfg.JitterMs > 0 {
		sleep += rand.Intn(cfg.JitterMs + 1)
	}
	if sleep > 0 {
		time.Sleep(time.Duration(sleep) * time.Millisecond)
	}
	return cfg.FailureRate > 0 && rand.Float64() < cfg.FailureRate
}

// ShouldErrorUpstream returns true with probability rate.
func ShouldErrorUpstream(rate float64) bool {
	return rate > 0 && rand.Float64() < rate
}
