package prometheus

import (
	"log/slog"
	"time"

	"github.com/prometheus/prometheus/promql"
)

func NewEngine(logger *slog.Logger, cfg Config) *Engine {
	var activeQueryTracker promql.QueryTracker
	if cfg.ActiveQueryTrackerConfig.Enabled {
		activeQueryTracker = promql.NewActiveQueryTracker(
			cfg.ActiveQueryTrackerConfig.Path,
			cfg.ActiveQueryTrackerConfig.MaxConcurrent,
			logger,
		)
	}

	return promql.NewEngine(promql.EngineOpts{
		Logger:             logger,
		Reg:                nil,
		MaxSamples:         50000000,
		Timeout:            time.Duration(2 * time.Minute),
		ActiveQueryTracker: activeQueryTracker,
	})
}
