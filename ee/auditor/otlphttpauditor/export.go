package otlphttpauditor

import (
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"go.opentelemetry.io/collector/pdata/plog"
	collogspb "go.opentelemetry.io/proto/otlp/collector/logs/v1"
	"google.golang.org/protobuf/proto"

	spb "google.golang.org/genproto/googleapis/rpc/status"
)

const (
	maxHTTPResponseReadBytes = 64 * 1024
	protobufContentType      = "application/x-protobuf"
)

// retryableError wraps an error that can be retried, optionally with a server-suggested delay.
type retryableError struct {
	err   error
	delay time.Duration
}

func (e *retryableError) Error() string { return e.err.Error() }
func (e *retryableError) Unwrap() error { return e.err }

func (p *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	logs := plog.NewLogs()
	rl := logs.ResourceLogs().AppendEmpty()
	rl.Resource().Attributes().PutStr("service.name", "signoz")
	sl := rl.ScopeLogs().AppendEmpty()
	sl.Scope().SetName("signoz.audit")

	for i := range events {
		events[i].ToLogRecord(sl.LogRecords().AppendEmpty())
	}

	request, err := p.marshaler.MarshalLogs(logs)
	if err != nil {
		return fmt.Errorf("failed to marshal audit logs: %w", err)
	}

	return p.send(ctx, request)
}

// send posts the request with internal retry for retryable errors.
// Uses exponential backoff from config, honouring Retry-After when available.
func (p *provider) send(ctx context.Context, request []byte) error {
	retryCfg := p.config.OTLPHTTP.Retry
	if !retryCfg.Enabled {
		return p.sendOnce(ctx, request)
	}

	interval := retryCfg.InitialInterval
	deadline := time.Now().Add(retryCfg.MaxElapsedTime)

	for {
		err := p.sendOnce(ctx, request)
		if err == nil {
			return nil
		}

		var re *retryableError
		if !errors.As(err, &re) || time.Now().After(deadline) {
			return err
		}

		wait := interval
		if re.delay > 0 {
			wait = re.delay
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}

		interval = min(interval*2, retryCfg.MaxInterval)
	}
}

// sendOnce posts a protobuf-encoded OTLP request to the configured endpoint.
// Returns a *retryableError for status codes that should be retried.
// Follows the OTel Collector's otlphttpexporter pattern:
// https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go
func (p *provider) sendOnce(ctx context.Context, request []byte) error {
	var body io.Reader
	if p.config.OTLPHTTP.Compression == "gzip" {
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		if _, err := gz.Write(request); err != nil {
			return fmt.Errorf("failed to gzip audit logs: %w", err)
		}
		if err := gz.Close(); err != nil {
			return fmt.Errorf("failed to close gzip writer: %w", err)
		}
		body = &buf
	} else {
		body = bytes.NewReader(request)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, body)
	if err != nil {
		return fmt.Errorf("failed to create audit export request: %w", err)
	}

	req.Header.Set("Content-Type", protobufContentType)
	if p.config.OTLPHTTP.Compression == "gzip" {
		req.Header.Set("Content-Encoding", "gzip")
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make an HTTP request: %w", err)
	}
	defer func() {
		_, _ = io.CopyN(io.Discard, resp.Body, maxHTTPResponseReadBytes)
		resp.Body.Close()
	}()

	if resp.StatusCode >= 200 && resp.StatusCode <= 299 {
		p.handlePartialSuccess(resp)
		return nil
	}

	respStatus := readResponseStatus(resp)

	var formattedErr error
	if respStatus != nil {
		formattedErr = fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d, Message=%s, Details=%v", p.endpoint, resp.StatusCode, respStatus.Message, respStatus.Details)
	} else {
		formattedErr = fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d", p.endpoint, resp.StatusCode)
	}

	if isRetryableStatusCode(resp.StatusCode) {
		return &retryableError{err: formattedErr, delay: parseRetryAfter(resp)}
	}

	return formattedErr
}

// handlePartialSuccess parses the ExportLogsServiceResponse from a 2xx response
// and logs a warning if any log records were rejected.
func (p *provider) handlePartialSuccess(resp *http.Response) {
	respBytes, err := readResponseBody(resp)
	if err != nil || respBytes == nil {
		return
	}

	exportResponse := &collogspb.ExportLogsServiceResponse{}
	if err := proto.Unmarshal(respBytes, exportResponse); err != nil {
		return
	}

	ps := exportResponse.GetPartialSuccess()
	if ps == nil {
		return
	}

	if ps.GetErrorMessage() != "" || ps.GetRejectedLogRecords() != 0 {
		p.settings.Logger().WarnContext(context.Background(), "partial success response", slog.String("message", ps.GetErrorMessage()), slog.Int64("dropped_log_records", ps.GetRejectedLogRecords()))
	}
}

func isRetryableStatusCode(code int) bool {
	switch code {
	case http.StatusTooManyRequests, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

// parseRetryAfter parses the Retry-After header value.
// Supports both delay-seconds and HTTP-date formats per RFC 7231 §7.1.3.
func parseRetryAfter(resp *http.Response) time.Duration {
	values := resp.Header.Values("Retry-After")
	if len(values) == 0 {
		return 0
	}

	if seconds, err := strconv.Atoi(values[0]); err == nil {
		return time.Duration(seconds) * time.Second
	}
	if date, err := time.Parse(time.RFC1123, values[0]); err == nil {
		return time.Until(date)
	}

	return 0
}

// readResponseBody reads at most maxHTTPResponseReadBytes from the response body.
func readResponseBody(resp *http.Response) ([]byte, error) {
	if resp.ContentLength == 0 {
		return nil, nil
	}

	maxRead := resp.ContentLength
	if maxRead == -1 || maxRead > maxHTTPResponseReadBytes {
		maxRead = maxHTTPResponseReadBytes
	}

	protoBytes := make([]byte, maxRead)
	n, err := io.ReadFull(resp.Body, protoBytes)
	if n == 0 && (err == nil || errors.Is(err, io.EOF)) {
		return nil, nil
	}
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, err
	}

	return protoBytes[:n], nil
}

// readResponseStatus decodes a protobuf-encoded Status from 4xx/5xx response bodies.
// Returns nil if the response is empty or cannot be decoded.
func readResponseStatus(resp *http.Response) *spb.Status {
	if resp.StatusCode < 400 || resp.StatusCode > 599 {
		return nil
	}

	respBytes, err := readResponseBody(resp)
	if err != nil || respBytes == nil {
		return nil
	}

	respStatus := &spb.Status{}
	if err := proto.Unmarshal(respBytes, respStatus); err != nil {
		return nil
	}

	return respStatus
}
