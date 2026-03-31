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

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/plog"
	"google.golang.org/protobuf/proto"

	spb "google.golang.org/genproto/googleapis/rpc/status"
)

const (
	maxHTTPResponseReadBytes = 64 * 1024
	protobufContentType      = "application/x-protobuf"
)

var _ auditor.Auditor = (*provider)(nil)

type provider struct {
	settings   factory.ScopedProviderSettings
	licensing  licensing.Licensing
	server     *auditorserver.Server
	marshaler  plog.ProtoMarshaler
	httpClient *http.Client
	endpoint   string
	compress   bool
}

func NewFactory(licensing licensing.Licensing) factory.ProviderFactory[auditor.Auditor, auditor.Config] {
	return factory.NewProviderFactory(factory.MustNewName("otlphttp"), func(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config) (auditor.Auditor, error) {
		return newProvider(ctx, providerSettings, config, licensing)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config auditor.Config, lic licensing.Licensing) (auditor.Auditor, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/auditor/otlphttpauditor")

	scheme := "https"
	if config.OTLPHTTP.Insecure {
		scheme = "http"
	}
	endpoint := fmt.Sprintf("%s://%s%s", scheme, config.OTLPHTTP.Endpoint, config.OTLPHTTP.URLPath)

	p := &provider{
		settings:   settings,
		licensing:  lic,
		marshaler:  plog.ProtoMarshaler{},
		httpClient: &http.Client{Timeout: config.OTLPHTTP.Timeout},
		endpoint:   endpoint,
		compress:   config.OTLPHTTP.Compression == "gzip",
	}

	server, err := auditorserver.New(
		settings,
		auditorserver.Config{
			BufferSize:    config.BufferSize,
			BatchSize:     config.BatchSize,
			FlushInterval: config.FlushInterval,
		},
		p.export,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create auditor server: %w", err)
	}

	p.server = server
	return p, nil
}

func (p *provider) Audit(ctx context.Context, event audittypes.AuditEvent) {
	if event.PrincipalOrgID == "" {
		return
	}

	orgID, err := valuer.NewUUID(event.PrincipalOrgID)
	if err != nil {
		p.settings.Logger().WarnContext(ctx, "audit event dropped, invalid org_id", slog.String("org_id", event.PrincipalOrgID))
		return
	}

	if _, err := p.licensing.GetActive(ctx, orgID); err != nil {
		return
	}

	p.server.Add(ctx, event)
}

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
// Follows the same pattern as the OTel Collector's otlphttpexporter:
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
	if respStatus != nil {
		return fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d, Message=%s, Details=%v", p.endpoint, resp.StatusCode, respStatus.Message, respStatus.Details)
	}

	return fmt.Errorf("error exporting audit logs, request to %s responded with HTTP Status Code %d", p.endpoint, resp.StatusCode)
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

// readResponseStatus decodes a protobuf-encoded Status from the response body.
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

func (p *provider) Start(ctx context.Context) error {
	return p.server.Start(ctx)
}

func (p *provider) Stop(ctx context.Context) error {
	return p.server.Stop(ctx)
}

func (p *provider) Healthy() <-chan struct{} {
	return p.server.Healthy()
}
