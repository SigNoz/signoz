package prometheustest

import (
	"log/slog"
	"os"
	"time"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/tsdb"
)

var _ prometheus.Prometheus = (*Provider)(nil)

type Provider struct {
	db     *tsdb.DB
	dir    string
	engine *prometheus.Engine
}

func New(logger *slog.Logger, cfg prometheus.Config, outOfOrderTimeWindow ...int64) *Provider {
	dir, err := os.MkdirTemp("", "test_storage")
	if err != nil {
		panic(err)
	}

	// Tests just load data for a series sequentially. Thus we
	// need a long appendable window.
	opts := tsdb.DefaultOptions()
	opts.MinBlockDuration = int64(24 * time.Hour / time.Millisecond)
	opts.MaxBlockDuration = int64(24 * time.Hour / time.Millisecond)
	opts.RetentionDuration = 0
	opts.EnableNativeHistograms = true

	// Set OutOfOrderTimeWindow if provided, otherwise use default (0)
	if len(outOfOrderTimeWindow) > 0 {
		opts.OutOfOrderTimeWindow = outOfOrderTimeWindow[0]
	} else {
		opts.OutOfOrderTimeWindow = 0 // Default value is zero
	}

	db, err := tsdb.Open(dir, nil, nil, opts, tsdb.NewDBStats())
	if err != nil {
		panic(err)
	}

	engine := prometheus.NewEngine(logger, cfg)

	return &Provider{
		db:     db,
		dir:    dir,
		engine: engine,
	}
}

func (provider *Provider) Engine() *prometheus.Engine {
	return provider.engine
}

func (provider *Provider) Storage() storage.Queryable {
	return provider.db
}

func (provider *Provider) Close() error {
	if err := provider.db.Close(); err != nil {
		return err
	}
	return os.RemoveAll(provider.dir)
}
