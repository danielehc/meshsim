package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"meshsim/internal/config"
	"meshsim/internal/server"
	"meshsim/internal/store"
)

// Version is set via ldflags: -X main.Version=<git describe>
var Version = "dev"

func main() {
	log.SetPrefix(fmt.Sprintf("[meshsim %s] ", Version))

	configPath := flag.String("config", "config.yaml", "Path to YAML config file")
	quotesFile := flag.String("quotes-file", "", "Path to quotes file (overrides config)")
	productsFile := flag.String("products-file", "", "Path to products file (overrides config)")
	counterEnabled := flag.Bool("counter", false, "Enable in-memory counter (overrides config)")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// CLI flags take precedence over config values.
	if *quotesFile != "" {
		cfg.QuotesFile = *quotesFile
		cfg.QuotesEnabled = true
	}
	if *productsFile != "" {
		cfg.ProductsFile = *productsFile
		cfg.ProductsEnabled = true
	}
	if *counterEnabled {
		cfg.CounterEnabled = true
	}

	if err := config.Validate(cfg); err != nil {
		log.Fatalf("Invalid config: %v", err)
	}

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "localhost"
	}
	if ip := localIP(); ip != "" {
		hostname = ip
	}

	log.Printf("Starting instance %q on port %d (color: %s, icon: %s)", cfg.Name, cfg.Port, cfg.Color, cfg.Icon)
	for _, up := range cfg.Upstreams {
		log.Printf("  upstream: %s @ %s:%d", up.Name, up.Address, up.Port)
	}

	var quotes *store.QuoteStore
	if cfg.QuotesEnabled && cfg.QuotesFile != "" {
		quotes, err = store.LoadQuotes(cfg.QuotesFile)
		if err != nil {
			log.Fatalf("Failed to load quotes file %q: %v", cfg.QuotesFile, err)
		}
		log.Printf("Loaded %d quotes from %s", quotes.Len(), cfg.QuotesFile)
	}

	var products *store.ProductStore
	if cfg.ProductsEnabled && cfg.ProductsFile != "" {
		products, err = store.LoadProducts(cfg.ProductsFile)
		if err != nil {
			log.Fatalf("Failed to load products file %q: %v", cfg.ProductsFile, err)
		}
		log.Printf("Loaded %d products from %s", products.Len(), cfg.ProductsFile)
	}

	app := server.NewApp(cfg, hostname, quotes, products)
	srv := server.NewServer(app)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Forced shutdown: %v", err)
	}
	log.Println("Stopped.")
}

func localIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer conn.Close()
	addr, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok {
		return ""
	}
	return addr.IP.String()
}
