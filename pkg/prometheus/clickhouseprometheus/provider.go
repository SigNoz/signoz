package clickhouseprometheus

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
)

var stCallback = func() (int64, error) {
	return int64(model.Latest), nil
}

type provider struct {
	settings       factory.ScopedProviderSettings
	telemetryStore telemetrystore.TelemetryStore
	engine         *prometheus.Engine
	queryable      storage.SampleAndChunkQueryable
}

func NewFactory(telemetryStore telemetrystore.TelemetryStore) factory.ProviderFactory[prometheus.Prometheus, prometheus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), func(ctx context.Context, providerSettings factory.ProviderSettings, config prometheus.Config) (prometheus.Prometheus, error) {
		return New(ctx, providerSettings, config, telemetryStore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config prometheus.Config, telemetryStore telemetrystore.TelemetryStore) (prometheus.Prometheus, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheus")

	readClient := NewReadClient(settings, telemetryStore)

	return &provider{
		settings:       settings,
		telemetryStore: telemetryStore,
		engine:         prometheus.NewEngine(settings.Logger(), config),
		queryable:      remote.NewSampleAndChunkQueryableClient(readClient, labels.EmptyLabels(), []*labels.Matcher{}, false, stCallback),
	}, nil
}

func (provider *provider) Engine() *prometheus.Engine {
	return provider.engine
}

func (provider *provider) Storage() storage.Queryable {
	return provider
}

func (provider *provider) Querier(mint, maxt int64) (storage.Querier, error) {
	querier, err := provider.queryable.Querier(mint, maxt)
	if err != nil {
		return nil, err
	}

	return storage.NewMergeQuerier(nil, []storage.Querier{querier}, storage.ChainedSeriesMerge), nil
}
