package kafkacondensedmeter

import (
	"context"
	"log/slog"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/plugin/kslog"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/SigNoz/signoz/pkg/condensedmeter"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
)

// maxDataPointsPerRecord keeps a record under the 1MB broker and producer limits: a point with four 255-character dimension values is about 1.2KB.
const maxDataPointsPerRecord = 500

var _ condensedmeter.Reporter = (*provider)(nil)

type provider struct {
	settings        factory.ScopedProviderSettings
	config          condensedmeter.Config
	flagger         flagger.Flagger
	licensing       licensing.Licensing
	orgGetter       organization.Getter
	clickhouseStore *clickhouseStore
	store           condensedmetertypes.Store
	build           version.Build
	marshaler       pmetric.ProtoMarshaler
	client          *kgo.Client
	healthyC        chan struct{}
	stopC           chan struct{}
}

func NewFactory(flagger flagger.Flagger, licensing licensing.Licensing, orgGetter organization.Getter, telemetryStore telemetrystore.TelemetryStore, sqlstore sqlstore.SQLStore, build version.Build) factory.ProviderFactory[condensedmeter.Reporter, condensedmeter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("kafka"), func(ctx context.Context, providerSettings factory.ProviderSettings, config condensedmeter.Config) (condensedmeter.Reporter, error) {
		return newProvider(ctx, providerSettings, config, flagger, licensing, orgGetter, telemetryStore, newStore(sqlstore), build)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config condensedmeter.Config, flagger flagger.Flagger, licensing licensing.Licensing, orgGetter organization.Getter, telemetryStore telemetrystore.TelemetryStore, store condensedmetertypes.Store, build version.Build) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/condensedmeter/kafkacondensedmeter")

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

	return &provider{
		settings:        settings,
		config:          config,
		flagger:         flagger,
		licensing:       licensing,
		orgGetter:       orgGetter,
		clickhouseStore: newClickhouseStore(telemetryStore),
		store:           store,
		build:           build,
		marshaler:       pmetric.ProtoMarshaler{},
		client:          client,
		healthyC:        make(chan struct{}),
		stopC:           make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	close(provider.healthyC)

	ticker := time.NewTicker(provider.config.Interval)
	defer ticker.Stop()

	provider.report(ctx)
	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			provider.report(ctx)
		}
	}
}

func (provider *provider) Stop(_ context.Context) error {
	close(provider.stopC)
	provider.client.Close()
	return nil
}

func (provider *provider) Healthy() <-chan struct{} {
	return provider.healthyC
}

func (provider *provider) report(ctx context.Context) {
	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to get orgs data", errors.Attr(err))
		return
	}

	for _, org := range orgs {
		if !provider.flagger.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(org.ID)) {
			continue
		}

		if _, err := provider.licensing.GetActive(ctx, org.ID); err != nil {
			if errors.Ast(err, errors.TypeNotFound) {
				continue
			}

			provider.settings.Logger().ErrorContext(ctx, "failed to fetch active license for org", errors.Attr(err), slog.String("org_id", org.ID.StringValue()))
			return
		}

		if err := provider.reportOrg(ctx, org.ID, time.Now()); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to report condensed rows", errors.Attr(err), slog.String("org_id", org.ID.StringValue()))
		}
	}
}

func (provider *provider) reportOrg(ctx context.Context, orgID valuer.UUID, now time.Time) error {
	next, err := provider.nextHour(ctx, orgID)
	if err != nil || next.IsZero() {
		return err
	}

	for _, hour := range condensedmetertypes.ClosedHours(next, now) {
		rows, err := provider.clickhouseStore.CondensedRows(ctx, provider.config.Dimensions, hour)
		if err != nil {
			return err
		}

		if len(rows) > 0 {
			if err := provider.send(ctx, rows, now); err != nil {
				return err
			}
		}

		if err := provider.store.Upsert(ctx, condensedmetertypes.NewCheckpoint(orgID, hour)); err != nil {
			return err
		}
	}

	return nil
}

// nextHour is the hour after the checkpoint, or the first hour after the first ingested meter row; zero when there is none yet.
func (provider *provider) nextHour(ctx context.Context, orgID valuer.UUID) (time.Time, error) {
	checkpoint, err := provider.store.Get(ctx, orgID)
	if err == nil {
		return checkpoint.LastReportedHour.UTC().Add(time.Hour), nil
	}

	if !errors.Ast(err, errors.TypeNotFound) {
		return time.Time{}, err
	}

	firstIngested, err := provider.clickhouseStore.FirstIngested(ctx)
	if err != nil || firstIngested.IsZero() {
		return time.Time{}, err
	}

	return condensedmetertypes.FirstHour(firstIngested), nil
}

// send stamps the points with the send time, not the hour they count, so an hour reported after its day is sealed lands in the next day instead of being missed.
func (provider *provider) send(ctx context.Context, rows []condensedmetertypes.Row, timestamp time.Time) error {
	records := make([]*kgo.Record, 0, (len(rows)+maxDataPointsPerRecord-1)/maxDataPointsPerRecord)
	for start := 0; start < len(rows); start += maxDataPointsPerRecord {
		metrics := condensedmetertypes.NewPMetrics(rows[start:min(start+maxDataPointsPerRecord, len(rows))], provider.config.Dimensions, timestamp, "signoz", provider.build.Version())

		value, err := provider.marshaler.MarshalMetrics(metrics)
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to marshal condensed rows")
		}

		records = append(records, &kgo.Record{Topic: provider.config.Kafka.Topic, Value: value})
	}

	if err := provider.client.ProduceSync(ctx, records...).FirstErr(); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to send condensed rows")
	}

	return nil
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
