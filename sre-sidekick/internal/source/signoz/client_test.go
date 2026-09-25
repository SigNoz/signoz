package signoz

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientQueryRangeUsesAPIKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v5/query_range" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("SIGNOZ-API-KEY") != "secret" {
			t.Fatalf("missing API key")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}))
	defer server.Close()

	var response map[string]any
	client := NewClient(server.URL, "secret")
	if err := client.QueryRange(context.Background(), map[string]any{"requestType": "scalar"}, &response); err != nil {
		t.Fatal(err)
	}
	if response["ok"] != true {
		t.Fatalf("unexpected response: %#v", response)
	}
}
