package otlphttpauditor

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	otellog "go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	sdklog "go.opentelemetry.io/otel/sdk/log"
)

var _ auditor.Auditor = (*provider)(nil)

type provider struct {
	settings       factory.ScopedProviderSettings
	licensing      licensing.Licensing
	server         *auditorserver.Server
	processor      *accumulatingProcessor
	loggerProvider *sdklog.LoggerProvider
	logger         otellog.Logger
}

func NewFactory(licensing licensing.Licensing) factory.ProviderFactory[auditor.Auditor, auditor.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("otlphttp"),
		newProviderFunc(licensing),
	)
}

func newProviderFunc(licensing licensing.Licensing) factory.NewProviderFunc[auditor.Auditor, auditor.Config] {
	return func(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config) (auditor.Auditor, error) {
		return newProvider(ctx, providerSettings, config, licensing)
	}
}

func newProvider(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config, lic licensing.Licensing) (auditor.Auditor, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/auditor/otlphttpauditor")

	opts := buildExporterOptions(config.OTLPHTTP)
	exporter, err := otlploghttp.New(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create otlploghttp exporter: %w", err)
	}

	processor := newAccumulatingProcessor(exporter)
	loggerProvider := sdklog.NewLoggerProvider(sdklog.WithProcessor(processor))
	logger := loggerProvider.Logger("signoz.audit")

	p := &provider{
		settings:       settings,
		licensing:      lic,
		processor:      processor,
		loggerProvider: loggerProvider,
		logger:         logger,
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

	event.Body = buildBody(event)
	p.server.Add(ctx, event)
}

func (p *provider) Start(ctx context.Context) error {
	return p.server.Start(ctx)
}

func (p *provider) Stop(ctx context.Context) error {
	if err := p.server.Stop(ctx); err != nil {
		return err
	}

	return p.loggerProvider.Shutdown(ctx)
}

func (p *provider) Healthy() <-chan struct{} {
	return p.server.Healthy()
}

func buildExporterOptions(config auditor.OTLPHTTPConfig) []otlploghttp.Option {
	opts := []otlploghttp.Option{
		otlploghttp.WithEndpoint(config.Endpoint),
		otlploghttp.WithURLPath(config.URLPath),
		otlploghttp.WithTimeout(config.Timeout),
	}

	if config.Insecure {
		opts = append(opts, otlploghttp.WithInsecure())
	}

	if config.Compression == "gzip" {
		opts = append(opts, otlploghttp.WithCompression(otlploghttp.GzipCompression))
	}

	if len(config.Headers) > 0 {
		opts = append(opts, otlploghttp.WithHeaders(config.Headers))
	}

	if config.Retry.Enabled {
		opts = append(opts, otlploghttp.WithRetry(otlploghttp.RetryConfig{
			Enabled:         true,
			InitialInterval: config.Retry.InitialInterval,
			MaxInterval:     config.Retry.MaxInterval,
			MaxElapsedTime:  config.Retry.MaxElapsedTime,
		}))
	}

	return opts
}
