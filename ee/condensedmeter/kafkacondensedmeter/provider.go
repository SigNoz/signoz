package kafkacondensedmeter

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/plugin/kslog"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/condensedmeter"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
)

const metricNameMetricsDataPointsIngestedCount = "signoz.meter.metric.datapoint.ingested.count"

var _ condensedmeter.Reporter = (*provider)(nil)

type provider struct {
	settings       factory.ScopedProviderSettings
	config         condensedmeter.Config
	flagger        flagger.Flagger
	licensing      licensing.Licensing
	orgGetter      organization.Getter
	telemetryStore telemetrystore.TelemetryStore
	store          condensedmetertypes.Store
	build          version.Build
	marshaler      pmetric.ProtoMarshaler
	client         *kgo.Client
	healthyC       chan struct{}
	stopC          chan struct{}
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
		settings:       settings,
		config:         config,
		flagger:        flagger,
		licensing:      licensing,
		orgGetter:      orgGetter,
		telemetryStore: telemetryStore,
		store:          store,
		build:          build,
		marshaler:      pmetric.ProtoMarshaler{},
		client:         client,
		healthyC:       make(chan struct{}),
		stopC:          make(chan struct{}),
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
		rows, err := provider.condensedRows(ctx, hour)
		if err != nil {
			return err
		}

		if len(rows) > 0 {
			if err := provider.send(ctx, rows, hour); err != nil {
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

	firstIngested, err := provider.firstIngested(ctx)
	if err != nil || firstIngested.IsZero() {
		return time.Time{}, err
	}

	return condensedmetertypes.FirstHour(firstIngested), nil
}

func (provider *provider) firstIngested(ctx context.Context) (time.Time, error) {
	query := fmt.Sprintf("SELECT toInt64(ifNull(min(unix_milli), 0)) FROM %s.%s WHERE metric_name = ?", metertelemetryschema.DBName, metertelemetryschema.SamplesTableName)

	var unixMilli int64
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, query, metricNameMetricsDataPointsIngestedCount).Scan(&unixMilli); err != nil {
		return time.Time{}, errors.WrapInternalf(err, errors.CodeInternal, "failed to query first ingested meter row")
	}

	if unixMilli == 0 {
		return time.Time{}, nil
	}

	return time.UnixMilli(unixMilli), nil
}

// condensedRows counts distinct (reduced_fingerprint, minute) in both reduced tables, since the condensing views append each minute several times.
// A minute never appears in both tables: gauges go to one and counters to the other.
// Dimensions come from the reduced series; a condensed row without its series is still counted, without dimensions.
func (provider *provider) condensedRows(ctx context.Context, hour time.Time) ([]condensedmetertypes.Row, error) {
	dimensions := provider.config.Dimensions
	aliases := make([]string, len(dimensions))
	selects := make([]string, len(dimensions))
	for i, dimension := range dimensions {
		aliases[i] = clickhousesql.Identifier(fmt.Sprintf("dimension_%d", i))
		selects[i] = fmt.Sprintf("any(resource_attrs[%s]) AS %s", clickhousesql.StringLiteral(dimension), aliases[i])
	}

	condensed := func(table string) string {
		return fmt.Sprintf("SELECT reduced_fingerprint, unix_milli FROM %s.%s WHERE unix_milli >= ? AND unix_milli < ? AND NOT match(metric_name, '^(signoz|otelcol)') GROUP BY reduced_fingerprint, unix_milli", metricstelemetryschema.DBName, table)
	}

	query := fmt.Sprintf(
		"SELECT %s FROM (%s UNION ALL %s) AS condensed LEFT JOIN (SELECT %s FROM %s.%s WHERE unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint) AS series ON condensed.reduced_fingerprint = series.fingerprint",
		strings.Join(append(aliases, "toUInt64(count())"), ", "),
		condensed(metricstelemetryschema.SamplesV4ReducedLastTableName),
		condensed(metricstelemetryschema.SamplesV4ReducedSumTableName),
		strings.Join(append([]string{"fingerprint"}, selects...), ", "),
		metricstelemetryschema.DBName,
		metricstelemetryschema.TimeseriesV4ReducedTableName,
	)
	if len(aliases) > 0 {
		query += " GROUP BY " + strings.Join(aliases, ", ")
	}

	start, end := hour.UnixMilli(), hour.Add(time.Hour).UnixMilli()
	rows, err := provider.telemetryStore.ClickhouseDB().Query(ctx, query, start, end, start, end, start, end)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query condensed rows")
	}
	defer rows.Close()

	condensedRows := []condensedmetertypes.Row{}
	for rows.Next() {
		row := condensedmetertypes.Row{Values: make([]string, len(dimensions))}
		dest := make([]any, 0, len(dimensions)+1)
		for i := range row.Values {
			dest = append(dest, &row.Values[i])
		}
		dest = append(dest, &row.Count)

		if err := rows.Scan(dest...); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan condensed rows")
		}

		if row.Count > 0 {
			condensedRows = append(condensedRows, row)
		}
	}

	return condensedRows, rows.Err()
}

func (provider *provider) send(ctx context.Context, rows []condensedmetertypes.Row, hour time.Time) error {
	metrics := condensedmetertypes.NewPMetrics(rows, provider.config.Dimensions, hour, "signoz", provider.build.Version())

	value, err := provider.marshaler.MarshalMetrics(metrics)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to marshal condensed rows")
	}

	if err := provider.client.ProduceSync(ctx, &kgo.Record{Topic: provider.config.Kafka.Topic, Value: value}).FirstErr(); err != nil {
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
