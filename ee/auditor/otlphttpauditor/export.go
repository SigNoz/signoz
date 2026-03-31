package otlphttpauditor

import (
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
	"go.opentelemetry.io/collector/pdata/plog"
	"google.golang.org/protobuf/proto"

	spb "google.golang.org/genproto/googleapis/rpc/status"
)

const (
	maxHTTPResponseReadBytes = 64 * 1024
	protobufContentType      = "application/x-protobuf"
)

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

// send posts a protobuf-encoded OTLP request to the configured endpoint.
// Follows the OTel Collector's otlphttpexporter pattern:
// https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go
func (p *provider) send(ctx context.Context, request []byte) error {
	var body io.Reader
	if p.compress {
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
	if p.compress {
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
		return nil
	}

	respStatus := readResponseStatus(resp)

	var formattedErr error
	if respStatus != nil {
		formattedErr = fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d, Message=%s, Details=%v", p.endpoint, resp.StatusCode, respStatus.Message, respStatus.Details)
	} else {
		formattedErr = fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d", p.endpoint, resp.StatusCode)
	}

	if isThrottleError(resp.StatusCode) {
		if retryAfter := parseRetryAfter(resp); retryAfter > 0 {
			return exporterhelper.NewThrottleRetry(formattedErr, retryAfter)
		}
	}

	return formattedErr
}

func isThrottleError(code int) bool {
	return code == http.StatusTooManyRequests || code == http.StatusServiceUnavailable
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
