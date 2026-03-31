package otlphttpauditor

import (
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
	config     auditor.Config
	licensing  licensing.Licensing
	server     *auditorserver.Server
	marshaler  plog.ProtoMarshaler
	httpClient *http.Client
	endpoint   string
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

	p := &provider{
		settings:   settings,
		config:     config,
		licensing:  lic,
		marshaler:  plog.ProtoMarshaler{},
		httpClient: &http.Client{Timeout: config.OTLPHTTP.Timeout},
		endpoint:   fmt.Sprintf("%s://%s%s", scheme, config.OTLPHTTP.Endpoint, config.OTLPHTTP.URLPath),
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

func (p *provider) Start(ctx context.Context) error {
	return p.server.Start(ctx)
}

func (p *provider) Stop(ctx context.Context) error {
	return p.server.Stop(ctx)
}

func (p *provider) Healthy() <-chan struct{} {
	return p.server.Healthy()
}
