package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync/atomic"
	"time"
)

type logEmitter interface {
	Emit(context.Context, bool, string) error
}

type otlpEmitter struct {
	endpoint    string
	service     string
	environment string
	client      *http.Client
}

func (e *otlpEmitter) Emit(ctx context.Context, healthy bool, reason string) error {
	now := time.Now()
	attributes := []map[string]any{
		attribute("telemetry.demo.mode", stringValue(modeName(healthy))),
		attribute("telemetry.demo.reason", stringValue(reason)),
	}
	logRecord := map[string]any{
		"timeUnixNano":         fmt.Sprintf("%d", now.UnixNano()),
		"observedTimeUnixNano": fmt.Sprintf("%d", now.UnixNano()),
		"severityNumber":       9,
		"severityText":         "INFO",
		"body":                 stringValue("log-demo-backend heartbeat"),
		"attributes":           attributes,
	}
	if healthy {
		traceID, err := randomBytes(16)
		if err != nil {
			return err
		}
		spanID, err := randomBytes(8)
		if err != nil {
			return err
		}
		logRecord["traceId"] = hex.EncodeToString(traceID)
		logRecord["spanId"] = hex.EncodeToString(spanID)
	}

	payload := map[string]any{
		"resourceLogs": []any{map[string]any{
			"resource": map[string]any{
				"attributes": []any{
					attribute("service.name", stringValue(e.service)),
					attribute("deployment.environment", stringValue(e.environment)),
					attribute("service.version", stringValue("demo-1.0.0")),
				},
			},
			"scopeLogs": []any{map[string]any{
				"scope":      map[string]any{"name": "log-demo-backend"},
				"logRecords": []any{logRecord},
			}},
		}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode OTLP log: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create OTLP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := e.client.Do(req)
	if err != nil {
		return fmt.Errorf("send OTLP log: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		message, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
		return fmt.Errorf("OTLP collector returned %s: %s", resp.Status, string(message))
	}
	return nil
}

func attribute(key string, value map[string]any) map[string]any {
	return map[string]any{"key": key, "value": value}
}

func stringValue(value string) map[string]any {
	return map[string]any{"stringValue": value}
}

func randomBytes(size int) ([]byte, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return nil, fmt.Errorf("generate trace context: %w", err)
	}
	return value, nil
}

func modeName(healthy bool) string {
	if healthy {
		return "healthy"
	}
	return "missing_trace_id"
}

type demoServer struct {
	emitter logEmitter
	healthy atomic.Bool
}

func newDemoServer(emitter logEmitter) *demoServer {
	server := &demoServer{emitter: emitter}
	server.healthy.Store(true)
	return server
}

func (s *demoServer) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /status", s.status)
	mux.HandleFunc("POST /work", s.work)
	mux.HandleFunc("POST /demo/unhealthy", s.unhealthy)
	mux.HandleFunc("POST /demo/healthy", s.recover)
	return mux
}

func (s *demoServer) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":              "ok",
		"application_healthy": true,
		"telemetry_mode":      modeName(s.healthy.Load()),
	})
}

func (s *demoServer) status(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"application_healthy": true,
		"telemetry_mode":      modeName(s.healthy.Load()),
	})
}

func (s *demoServer) work(w http.ResponseWriter, r *http.Request) {
	s.emitAndRespond(w, r, "manual-work")
}

func (s *demoServer) unhealthy(w http.ResponseWriter, r *http.Request) {
	s.healthy.Store(false)
	s.emitAndRespond(w, r, "fault-injected")
}

func (s *demoServer) recover(w http.ResponseWriter, r *http.Request) {
	s.healthy.Store(true)
	s.emitAndRespond(w, r, "fault-cleared")
}

func (s *demoServer) emitAndRespond(w http.ResponseWriter, r *http.Request, reason string) {
	healthy := s.healthy.Load()
	if err := s.emitter.Emit(r.Context(), healthy, reason); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"application_healthy": true,
			"telemetry_mode":      modeName(healthy),
			"export_error":        err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"application_healthy": true,
		"telemetry_mode":      modeName(healthy),
		"log_exported":        true,
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func main() {
	listen := flag.String("listen", ":8090", "HTTP listen address")
	otlpEndpoint := flag.String("otlp-endpoint", envOr("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", "http://localhost:4318/v1/logs"), "OTLP/HTTP logs endpoint")
	service := flag.String("service", "log-demo-backend", "OpenTelemetry service.name")
	environment := flag.String("environment", "demo", "deployment.environment")
	heartbeat := flag.Duration("heartbeat", 2*time.Second, "log heartbeat interval")
	flag.Parse()

	emitter := &otlpEmitter{
		endpoint:    *otlpEndpoint,
		service:     *service,
		environment: *environment,
		client:      &http.Client{Timeout: 5 * time.Second},
	}
	server := newDemoServer(emitter)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		ticker := time.NewTicker(*heartbeat)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := emitter.Emit(ctx, server.healthy.Load(), "heartbeat"); err != nil {
					slog.Error("export heartbeat log", "error", err)
				}
			}
		}
	}()

	if err := emitter.Emit(ctx, true, "startup"); err != nil {
		slog.Warn("export startup log", "error", err)
	}
	slog.Info("log demo backend listening", "address", *listen, "otlp_endpoint", *otlpEndpoint)
	if err := http.ListenAndServe(*listen, server.handler()); err != nil {
		slog.Error("log demo backend stopped", "error", err)
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
