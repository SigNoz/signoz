package signoz

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestManagementOperationsAreIdempotentAndScoped(t *testing.T) {
	var mu sync.Mutex
	var paths []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		paths = append(paths, r.Method+" "+r.URL.Path)
		mu.Unlock()
		switch r.Method + " " + r.URL.Path {
		case "GET /api/v1/dashboards":
			_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{}})
		case "POST /api/v1/dashboards":
			_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"id": "dash-1"}})
		case "GET /api/v1/channels", "GET /api/v2/rules":
			_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{}})
		case "POST /api/v1/channels", "POST /api/v2/rules":
			w.WriteHeader(http.StatusCreated)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "key")
	if _, created, err := client.GenerateDashboard(context.Background(), map[string]any{"title": "SLO dashboard"}); err != nil || !created {
		t.Fatalf("dashboard creation failed: created=%v err=%v", created, err)
	}
	if err := client.EnsureChannel(context.Background(), "alerts", "http://webhook.local/alerts"); err != nil {
		t.Fatal(err)
	}
	created, err := client.GenerateBurnRateAlert(context.Background(), "fast-alert", map[string]any{"alert": "fast-alert"})
	if err != nil || !created {
		t.Fatalf("alert creation failed: created=%v err=%v", created, err)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(paths) != 6 {
		t.Fatalf("unexpected management calls: %v", paths)
	}
}
