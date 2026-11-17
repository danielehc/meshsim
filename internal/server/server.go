package server

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

// loggingMiddleware wraps a handler with request logging.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(lrw, r)
		log.Printf("%s %s %s %d %s",
			time.Now().UTC().Format(time.RFC3339),
			r.Method,
			r.URL.Path,
			lrw.statusCode,
			time.Since(start).Round(time.Millisecond),
		)
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// NewServer creates the HTTP server with all routes registered.
func NewServer(app *App) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/", app.handleRoot)
	mux.HandleFunc("/ui", app.handleUI)
	mux.HandleFunc("/ui/styles.css", app.handleUIAsset("styles.css", "text/css"))
	mux.HandleFunc("/ui/app.js", app.handleUIAsset("app.js", "application/javascript"))
	mux.HandleFunc("/health", app.handleHealth)
	mux.HandleFunc("/count/get", app.handleCountGet)
	mux.HandleFunc("/count/add", app.handleCountAdd)

	return &http.Server{
		Addr:         fmt.Sprintf(":%d", app.Cfg.Port),
		Handler:      loggingMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
}
