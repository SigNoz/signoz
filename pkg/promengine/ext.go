package promengine

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
)

var _ PromEngine = (*ExtEngine)(nil)

type ExtEngine struct {
	engine        *promql.Engine
	fanoutStorage storage.Storage
}

func New(logger *slog.Logger, cfg Config) (*ExtEngine, error) {
	if logger == nil {
		return nil, fmt.Errorf("logger is required")
	}

	gokitLogger := instrumentation.NewGoKitLoggerFromSlogHandler(logger.Handler(), "msg")

	var activeQueryTracker promql.QueryTracker
	if cfg.ActiveQueryTrackerConfig.Enabled {
		activeQueryTracker = promql.NewActiveQueryTracker(
			cfg.ActiveQueryTrackerConfig.Path,
			cfg.ActiveQueryTrackerConfig.MaxConcurrent,
			gokitLogger,
		)
	}

	engine := promql.NewEngine(promql.EngineOpts{
		Logger:             gokitLogger,
		Reg:                nil,
		MaxSamples:         50000000,
		Timeout:            time.Duration(2 * time.Minute),
		ActiveQueryTracker: activeQueryTracker,
	})

	remoteStorage := remote.NewStorage(
		gokitLogger,
		nil,
		func() (int64, error) { return int64(model.Latest), nil },
		"",
		time.Duration(1*time.Minute),
		nil,
		false,
	)
	fanoutStorage := storage.NewFanout(gokitLogger, remoteStorage)

	config := &config.Config{
		RemoteReadConfigs: []*config.RemoteReadConfig{
			{
				URL: &commoncfg.URL{URL: cfg.RemoteReadConfig.URL},
			},
		},
	}

	if err := config.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}

	if err := remoteStorage.ApplyConfig(config); err != nil {
		return nil, err
	}

	return &ExtEngine{
		engine:        engine,
		fanoutStorage: fanoutStorage,
	}, nil
}

func (engine *ExtEngine) Engine() *promql.Engine {
	return engine.engine
}

func (engine *ExtEngine) Storage() storage.Storage {
	return engine.fanoutStorage
}
