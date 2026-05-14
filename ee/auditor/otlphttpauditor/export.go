package otlphttpauditor

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	collogspb "go.opentelemetry.io/proto/otlp/collector/logs/v1"
	"google.golang.org/protobuf/proto"

	spb "google.golang.org/genproto/googleapis/rpc/status"
)

const (
	maxHTTPResponseReadBytes int64  = 64 * 1024
	protobufContentType      string = "application/x-protobuf"
)

func (provider *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	logs := audittypes.NewPLogsFromAuditEvents(events, "signoz", provider.build.Version(), "signoz.audit")

	request, err := provider.marshaler.MarshalLogs(logs)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "failed to marshal audit logs")
	}

	if err := provider.send(ctx, request); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "audit export failed", errors.Attr(err), slog.Int("dropped_log_records", len(events)))
		return err
	}

	return nil
}

// Posts a protobuf-encoded OTLP request to the configured endpoint.
// Retries are handled by the underlying heimdall HTTP client.
// Ref: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go
func (provider *provider) send(ctx context.Context, body []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, provider.config.OTLPHTTP.Endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", protobufContentType)

	res, err := provider.httpClient.Do(req)
	if err != nil {
		return err
	}

	defer func() {
		_, _ = io.CopyN(io.Discard, res.Body, maxHTTPResponseReadBytes)
		res.Body.Close()
	}()

	if res.StatusCode >= 200 && res.StatusCode <= 299 {
		provider.onSuccess(ctx, res)
		return nil
	}

	return provider.onErr(res)
}

// Ref: https://github.com/open-telemetry/opentelemetry-collector/blob/01b07fcbb7a253bd996c290dcae6166e71d13732/exporter/otlphttpexporter/otlp.go#L403.
func (provider *provider) onSuccess(ctx context.Context, res *http.Response) {
	resBytes, err := readResponseBody(res)
	if err != nil || resBytes == nil {
		return
	}

	exportResponse := &collogspb.ExportLogsServiceResponse{}
	if err := proto.Unmarshal(resBytes, exportResponse); err != nil {
		return
	}

	ps := exportResponse.GetPartialSuccess()
	if ps == nil {
		return
	}

	if ps.GetErrorMessage() != "" || ps.GetRejectedLogRecords() != 0 {
		provider.settings.Logger().WarnContext(ctx, "partial success response", slog.String("message", ps.GetErrorMessage()), slog.Int64("dropped_log_records", ps.GetRejectedLogRecords()))
	}
}

func (provider *provider) onErr(res *http.Response) error {
	status := readResponseStatus(res)

	if status != nil {
		return errors.Newf(errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "request to %s responded with status code %d, Message=%s, Details=%v", provider.config.OTLPHTTP.Endpoint.String(), res.StatusCode, status.Message, status.Details)
	}

	return errors.Newf(errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "request to %s responded with status code %d", provider.config.OTLPHTTP.Endpoint.String(), res.StatusCode)
}

// Reads at most maxHTTPResponseReadBytes from the response body.
// Ref: https://github.com/open-telemetry/opentelemetry-collector/blob/01b07fcbb7a253bd996c290dcae6166e71d13732/exporter/otlphttpexporter/otlp.go#L275.
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

// Decodes a protobuf-encoded Status from 4xx/5xx response bodies. Returns nil if the response is empty or cannot be decoded.
// Ref: https://github.com/open-telemetry/opentelemetry-collector/blob/01b07fcbb7a253bd996c290dcae6166e71d13732/exporter/otlphttpexporter/otlp.go#L310.
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
