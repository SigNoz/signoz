package otlphttpauditor

import (
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/plog"
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

	body, err := p.marshaler.MarshalLogs(logs)
	if err != nil {
		return fmt.Errorf("failed to marshal audit logs: %w", err)
	}

	return p.send(ctx, body)
}

func (p *provider) send(ctx context.Context, body []byte) error {
	var reader *bytes.Reader

	if p.compress {
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		if _, err := gz.Write(body); err != nil {
			return fmt.Errorf("failed to gzip audit logs: %w", err)
		}
		if err := gz.Close(); err != nil {
			return fmt.Errorf("failed to close gzip writer: %w", err)
		}
		reader = bytes.NewReader(buf.Bytes())
	} else {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, reader)
	if err != nil {
		return fmt.Errorf("failed to create audit export request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-protobuf")
	if p.compress {
		req.Header.Set("Content-Encoding", "gzip")
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("audit export request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("audit export returned status %d", resp.StatusCode)
	}

	return nil
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
