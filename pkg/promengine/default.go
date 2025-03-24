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

var _ PromEngine = (*defaultEngine)(nil)

type defaultEngine struct {
	engine        *promql.Engine
	fanoutStorage storage.Storage
}

func New(logger *slog.Logger, cfg Config) (*defaultEngine, error) {
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

	// For some reason, prometheusConfig.UnmarshalYAML(func(i interface{}) error { return nil })
	// is not working, so we need to load the config from a string
	prometheusConfig, err := config.Load((&config.Config{
		RemoteReadConfigs: []*config.RemoteReadConfig{
			{
				URL: &commoncfg.URL{URL: cfg.RemoteReadConfig.URL},
			},
		},
	}).String(), false, gokitLogger)

	if err != nil {
		return nil, err
	}

	if err := remoteStorage.ApplyConfig(prometheusConfig); err != nil {
		return nil, err
	}

	return &defaultEngine{
		engine:        engine,
		fanoutStorage: fanoutStorage,
	}, nil
}

func (engine *defaultEngine) Engine() *promql.Engine {
	return engine.engine
}

func (engine *defaultEngine) Storage() storage.Storage {
	return engine.fanoutStorage
}
