package otlphttpauditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/factory"
	client "github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/version"
	"go.opentelemetry.io/collector/pdata/plog"
)

var _ auditor.Auditor = (*provider)(nil)

type provider struct {
	settings   factory.ScopedProviderSettings
	config     auditor.Config
	licensing  licensing.Licensing
	build      version.Build
	server     *auditorserver.Server
	marshaler  plog.ProtoMarshaler
	httpClient *client.Client
}

func NewFactory(licensing licensing.Licensing, build version.Build) factory.ProviderFactory[auditor.Auditor, auditor.Config] {
	return factory.NewProviderFactory(factory.MustNewName("otlphttp"), func(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config) (auditor.Auditor, error) {
		return newProvider(ctx, providerSettings, config, licensing, build)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config auditor.Config, licensing licensing.Licensing, build version.Build) (auditor.Auditor, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/auditor/otlphttpauditor")

	httpClient, err := client.New(
		settings.Logger(),
		providerSettings.TracerProvider,
		providerSettings.MeterProvider,
		client.WithTimeout(config.OTLPHTTP.Timeout),
		client.WithRetryCount(retryCountFromConfig(config.OTLPHTTP.Retry)),
		retrierOption(config.OTLPHTTP.Retry),
	)
	if err != nil {
		return nil, err
	}

	provider := &provider{
		settings:   settings,
		config:     config,
		licensing:  licensing,
		build:      build,
		marshaler:  plog.ProtoMarshaler{},
		httpClient: httpClient,
	}

	server, err := auditorserver.New(settings,
		auditorserver.Config{
			BufferSize:    config.BufferSize,
			BatchSize:     config.BatchSize,
			FlushInterval: config.FlushInterval,
		},
		provider.export,
	)
	if err != nil {
		return nil, err
	}

	provider.server = server
	return provider, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.server.Start(ctx)
}

func (provider *provider) Audit(ctx context.Context, event audittypes.AuditEvent) {
	if event.PrincipalOrgID.IsZero() {
		provider.settings.Logger().WarnContext(ctx, "audit event dropped as org_id is zero")
		return
	}

	if _, err := provider.licensing.GetActive(ctx, event.PrincipalOrgID); err != nil {
		return
	}

	provider.server.Add(ctx, event)
}

func (provider *provider) Healthy() <-chan struct{} {
	return provider.server.Healthy()
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.server.Stop(ctx)
}
