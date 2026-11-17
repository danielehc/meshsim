package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// UpstreamConfig is the address of a peer service.
type UpstreamConfig struct {
	Name    string `yaml:"name"`
	Address string `yaml:"address"`
	Port    int    `yaml:"port"`
}

// QoSConfig holds quality-of-service simulation parameters.
type QoSConfig struct {
	LatencyMs   int     `yaml:"latency_ms"   json:"latency_ms"`
	JitterMs    int     `yaml:"jitter_ms"    json:"jitter_ms"`
	FailureRate float64 `yaml:"failure_rate" json:"failure_rate"`
	ErrorRate   float64 `yaml:"error_rate"   json:"error_rate"`
}

// Config is the top-level application configuration.
type Config struct {
	Name            string           `yaml:"name"`
	Color           string           `yaml:"color"`
	Icon            string           `yaml:"icon"`
	Tag             string           `yaml:"tag"`
	TagColor        string           `yaml:"tag_color"`
	TagIcon         string           `yaml:"tag_icon"`
	Port            int              `yaml:"port"`
	Upstreams       []UpstreamConfig `yaml:"upstreams"`
	QoS             QoSConfig        `yaml:"qos"`
	QuotesEnabled   bool             `yaml:"quotes_enabled"`
	QuotesFile      string           `yaml:"quotes_file"`
	ProductsEnabled bool             `yaml:"products_enabled"`
	ProductsFile    string           `yaml:"products_file"`
	CounterEnabled  bool             `yaml:"counter_enabled"`
	UIRefreshSecs   int              `yaml:"ui_refresh_secs"`
	RoundRobin      bool             `yaml:"round_robin"`
}

// Load reads and parses a YAML config file and applies defaults.
func Load(path string) (*Config, error) {
	if strings.ToLower(filepath.Ext(path)) == ".hcl" {
		return nil, fmt.Errorf("HCL config format is not supported; use YAML")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config file %q: %w", path, err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing YAML config %q: %w", path, err)
	}
	if cfg.Port == 0 {
		cfg.Port = 8080
	}
	if cfg.Color == "" {
		cfg.Color = "#3b82f6"
	}
	if cfg.Icon == "" {
		cfg.Icon = "fa-gear"
	}
	if cfg.UIRefreshSecs <= 0 {
		cfg.UIRefreshSecs = 5
	}
	for i := range cfg.Upstreams {
		if cfg.Upstreams[i].Address == "" {
			cfg.Upstreams[i].Address = "localhost"
		}
	}
	return &cfg, nil
}

// Validate checks the configuration for fatal problems.
func Validate(cfg *Config) error {
	if cfg.Name == "" {
		return fmt.Errorf("config: name is required")
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		return fmt.Errorf("config: port %d is out of range [1, 65535]", cfg.Port)
	}
	if cfg.QoS.FailureRate < 0 || cfg.QoS.FailureRate > 1 {
		return fmt.Errorf("config: qos.failure_rate must be in [0, 1]")
	}
	if cfg.QoS.ErrorRate < 0 || cfg.QoS.ErrorRate > 1 {
		return fmt.Errorf("config: qos.error_rate must be in [0, 1]")
	}
	if cfg.QuotesEnabled && cfg.QuotesFile != "" {
		if _, err := os.Stat(cfg.QuotesFile); err != nil {
			return fmt.Errorf("config: quotes_file %q: %w", cfg.QuotesFile, err)
		}
	}
	if cfg.ProductsEnabled && cfg.ProductsFile != "" {
		if _, err := os.Stat(cfg.ProductsFile); err != nil {
			return fmt.Errorf("config: products_file %q: %w", cfg.ProductsFile, err)
		}
	}
	return nil
}
