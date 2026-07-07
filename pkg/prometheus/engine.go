package prometheus

import (
	"log/slog"

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
		MaxSamples:         5_0000_000,
		Timeout:            cfg.Timeout,
		ActiveQueryTracker: activeQueryTracker,
		LookbackDelta:      cfg.LookbackDelta,
	})
}
