package prometheus

import (
	"log/slog"
	"time"

	"github.com/prometheus/common/model"
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

// init initializes the prometheus model with UTF8 validation
func init() {
	model.NameValidationScheme = model.UTF8Validation
}
