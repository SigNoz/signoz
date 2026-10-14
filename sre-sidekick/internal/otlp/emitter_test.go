package otlp

import "testing"

func TestNormalizeEndpoint(t *testing.T) {
	host, insecure, path, err := normalizeEndpoint("http://localhost:4318")
	if err != nil || host != "localhost:4318" || !insecure || path != "" {
		t.Fatalf("unexpected HTTP endpoint: %q %v %q %v", host, insecure, path, err)
	}
	host, insecure, path, err = normalizeEndpoint("localhost:4318")
	if err != nil || host != "localhost:4318" || !insecure || path != "/v1/metrics" {
		t.Fatalf("unexpected host endpoint: %q %v %q %v", host, insecure, path, err)
	}
}
