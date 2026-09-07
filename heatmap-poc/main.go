package main

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

//go:embed static
var embedded embed.FS

// diskAssets is preferred over the embedded copy when it exists, so editing the
// UI and reloading the page needs no rebuild. It resolves against the launch
// config's cwd, the repo root.
const diskAssets = "heatmap-poc/static"

func main() {
	addr := envOr("HEATMAP_POC_ADDR", "localhost:8099")
	upstream, err := url.Parse(envOr("SIGNOZ_URL", "http://localhost:8080"))
	if err != nil {
		slog.Error("SIGNOZ_URL is not a URL", "error", err)
		os.Exit(1)
	}

	apiKey := os.Getenv("SIGNOZ_API_KEY")
	if apiKey == "" {
		slog.Warn("SIGNOZ_API_KEY is unset, every upstream call will be rejected as unauthenticated")
	}

	mux := http.NewServeMux()
	mux.Handle("/api/", &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(upstream)
			r.Out.Host = upstream.Host
			r.Out.Header.Set("SIGNOZ-API-KEY", apiKey)
		},
		ErrorHandler: func(rw http.ResponseWriter, _ *http.Request, err error) {
			slog.Error("upstream call failed", "error", err)
			http.Error(rw, err.Error(), http.StatusBadGateway)
		},
	})
	mux.Handle("/", http.FileServerFS(assets()))

	slog.Info("listening", "url", "http://"+addr, "upstream", upstream.String())
	if err := http.ListenAndServe(addr, mux); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func assets() fs.FS {
	if stat, err := os.Stat(diskAssets); err == nil && stat.IsDir() {
		slog.Info("serving the UI from disk", "dir", diskAssets)
		return os.DirFS(diskAssets)
	}
	slog.Info("serving the embedded UI")
	sub, err := fs.Sub(embedded, "static")
	if err != nil {
		slog.Error("embedded assets are unreadable", "error", err)
		os.Exit(1)
	}
	return sub
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
