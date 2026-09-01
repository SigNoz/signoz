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
		MaxSamples:         5_0000_000,
		Timeout:            cfg.Timeout,
		ActiveQueryTracker: activeQueryTracker,
		LookbackDelta:      cfg.LookbackDelta,
		// The engine calls this for subqueries that do not set a step, such as
		// `metric[5m:]`, and segfaults if it is nil. 1m matches the default
		// global evaluation_interval that Prometheus wires here.
		NoStepSubqueryIntervalFn: func(int64) int64 {
			return time.Minute.Milliseconds()
		},
	})
}
