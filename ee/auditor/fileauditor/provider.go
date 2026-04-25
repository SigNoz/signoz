package fileauditor

import (
	"context"
	"os"
	"sync"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/version"
	"go.opentelemetry.io/collector/pdata/plog"
)

var _ auditor.Auditor = (*provider)(nil)

type provider struct {
	settings  factory.ScopedProviderSettings
	config    auditor.Config
	licensing licensing.Licensing
	build     version.Build
	server    *auditorserver.Server
	marshaler plog.JSONMarshaler
	file      *os.File
	mu        sync.Mutex
}

func NewFactory(licensing licensing.Licensing, build version.Build) factory.ProviderFactory[auditor.Auditor, auditor.Config] {
	return factory.NewProviderFactory(factory.MustNewName("file"), func(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config) (auditor.Auditor, error) {
		return newProvider(ctx, providerSettings, config, licensing, build)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config auditor.Config, licensing licensing.Licensing, build version.Build) (auditor.Auditor, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/auditor/fileauditor")

	file, err := os.OpenFile(config.File.Path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, auditor.ErrCodeAuditExportFailed, "failed to open audit file %q", config.File.Path)
	}

	provider := &provider{
		settings:  settings,
		config:    config,
		licensing: licensing,
		build:     build,
		marshaler: plog.JSONMarshaler{},
		file:      file,
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
		_ = file.Close()
		return nil, err
	}

	provider.server = server
	return provider, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.server.Start(ctx)
}

func (provider *provider) Audit(ctx context.Context, event audittypes.AuditEvent) {
	if event.PrincipalAttributes.PrincipalOrgID.IsZero() {
		provider.settings.Logger().WarnContext(ctx, "audit event dropped as org_id is zero")
		return
	}

	if _, err := provider.licensing.GetActive(ctx, event.PrincipalAttributes.PrincipalOrgID); err != nil {
		return
	}

	provider.server.Add(ctx, event)
}

func (provider *provider) Healthy() <-chan struct{} {
	return provider.server.Healthy()
}

func (provider *provider) Stop(ctx context.Context) error {
	serverErr := provider.server.Stop(ctx)
	fileErr := provider.file.Close()
	if serverErr != nil {
		return serverErr
	}
	return fileErr
}
