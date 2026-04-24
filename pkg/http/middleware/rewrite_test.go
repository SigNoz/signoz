package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRewrite(t *testing.T) {
	tests := []struct {
		name     string
		from     string
		to       string
		path     string
		wantPath string
	}{
		{
			name:     "rewrites matching prefix",
			from:     "/v1/o11y",
			to:       "/api",
			path:     "/v1/o11y/v1/dashboards",
			wantPath: "/api/v1/dashboards",
		},
		{
			name:     "passes through non-matching path",
			from:     "/v1/o11y",
			to:       "/api",
			path:     "/api/v1/dashboards",
			wantPath: "/api/v1/dashboards",
		},
		{
			name:     "rewrites exact prefix",
			from:     "/v1/o11y",
			to:       "/api",
			path:     "/v1/o11y",
			wantPath: "/api",
		},
		{
			name:     "no rewrite for partial match",
			from:     "/v1/o11y",
			to:       "/api",
			path:     "/v1/o11yxyz",
			wantPath: "/api" + "xyz",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var gotPath string
			inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				gotPath = r.URL.Path
			})
			rw := NewRewrite(tt.from, tt.to)
			handler := rw.Wrap(inner)
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			handler.ServeHTTP(httptest.NewRecorder(), req)
			if gotPath != tt.wantPath {
				t.Errorf("got path %q, want %q", gotPath, tt.wantPath)
			}
		})
	}
}

func TestRewrite_RawPath(t *testing.T) {
	var gotPath, gotRawPath string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotRawPath = r.URL.RawPath
	})
	rw := NewRewrite("/v1/o11y", "/api")
	handler := rw.Wrap(inner)

	req := httptest.NewRequest(http.MethodGet, "/v1/o11y/v1/query%20range", nil)
	// httptest.NewRequest sets both Path and RawPath for encoded URLs
	req.URL.Path = "/v1/o11y/v1/query range"
	req.URL.RawPath = "/v1/o11y/v1/query%20range"

	handler.ServeHTTP(httptest.NewRecorder(), req)

	if gotPath != "/api/v1/query range" {
		t.Errorf("got path %q, want %q", gotPath, "/api/v1/query range")
	}
	if gotRawPath != "/api/v1/query%20range" {
		t.Errorf("got raw path %q, want %q", gotRawPath, "/api/v1/query%20range")
	}
}
