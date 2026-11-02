package kafkaauditor

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/auditor/auditorserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/plugin/kslog"
	"go.opentelemetry.io/collector/pdata/plog"
)

var _ auditor.Auditor = (*provider)(nil)

type provider struct {
	settings  factory.ScopedProviderSettings
	config    auditor.Config
	licensing licensing.Licensing
	build     version.Build
	server    *auditorserver.Server
	marshaler plog.ProtoMarshaler
	client    *kgo.Client
}

func NewFactory(licensing licensing.Licensing, build version.Build) factory.ProviderFactory[auditor.Auditor, auditor.Config] {
	return factory.NewProviderFactory(factory.MustNewName("kafka"), func(ctx context.Context, providerSettings factory.ProviderSettings, config auditor.Config) (auditor.Auditor, error) {
		return newProvider(ctx, providerSettings, config, licensing, build)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config auditor.Config, licensing licensing.Licensing, build version.Build) (auditor.Auditor, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/auditor/kafkaauditor")

	// Acks from all in-sync replicas, idempotent writes and unbounded record retries are franz-go defaults and are kept as is.
	// A delivery timeout or retry limit lets franz-go < v1.22.2 ack a record that was never written (twmb/franz-go#1484).
	client, err := kgo.NewClient(
		kgo.SeedBrokers(config.Kafka.Brokers...),
		kgo.ClientID(config.Kafka.ClientID),
		kgo.ProducerBatchCompression(compressionCodec(config.Kafka.Compression)),
		kgo.ProducerLinger(0),
		kgo.WithLogger(kslog.New(settings.Logger())),
	)
	if err != nil {
		return nil, err
	}

	provider := &provider{
		settings:  settings,
		config:    config,
		licensing: licensing,
		build:     build,
		marshaler: plog.ProtoMarshaler{},
		client:    client,
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
		client.Close()
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
	ctx, cancel := context.WithTimeout(ctx, provider.config.Kafka.ShutdownTimeout)
	defer cancel()

	stoppedC := make(chan error, 1)
	go func() { stoppedC <- provider.server.Stop(ctx) }()

	select {
	case err := <-stoppedC:
		provider.client.Close()
		return err
	case <-ctx.Done():
		provider.settings.Logger().WarnContext(ctx, "audit drain timed out, closing kafka client", slog.Duration("shutdown_timeout", provider.config.Kafka.ShutdownTimeout))
		// Closing fails buffered and in-flight records, so the blocked export and the rest of the drain return immediately.
		provider.client.Close()
		return <-stoppedC
	}
}

func compressionCodec(name string) kgo.CompressionCodec {
	switch name {
	case "gzip":
		return kgo.GzipCompression()
	case "snappy":
		return kgo.SnappyCompression()
	case "lz4":
		return kgo.Lz4Compression()
	case "zstd":
		return kgo.ZstdCompression()
	default:
		return kgo.NoCompression()
	}
}
