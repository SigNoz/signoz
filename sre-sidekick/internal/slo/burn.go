package slo

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type MultiWindowBurn struct {
	Service       string  `json:"service"`
	Environment   string  `json:"environment"`
	SLO           string  `json:"slo"`
	Tier          string  `json:"tier"`
	Severity      string  `json:"severity"`
	LongBurn      float64 `json:"long_burn"`
	ShortBurn     float64 `json:"short_burn"`
	Firing        bool    `json:"firing"`
	Indeterminate bool    `json:"indeterminate"`
}

// EvaluateMultiWindow evaluates the configured SLO queries over both windows
// of every burn tier. It replaces the range selector in authored queries so
// the configured service/environment scope remains intact.
func (e *Engine) EvaluateMultiWindow(ctx context.Context, cfg Config, now time.Time, tiers []BurnTier) ([]MultiWindowBurn, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if e.Scalar == nil {
		return nil, fmt.Errorf("SLO scalar querier is required")
	}
	results := make([]MultiWindowBurn, 0, len(cfg.SLOs)*len(tiers))
	for _, definition := range cfg.SLOs {
		for _, tier := range tiers {
			long := definition
			long.Window = tier.LongWindow
			long.GoodQuery = replaceWindow(definition.GoodQuery, definition.Window, tier.LongWindow)
			long.TotalQuery = replaceWindow(definition.TotalQuery, definition.Window, tier.LongWindow)
			short := definition
			short.Window = tier.ShortWindow
			short.GoodQuery = replaceWindow(definition.GoodQuery, definition.Window, tier.ShortWindow)
			short.TotalQuery = replaceWindow(definition.TotalQuery, definition.Window, tier.ShortWindow)
			longReport := e.evaluate(ctx, cfg, long, now)
			shortReport := e.evaluate(ctx, cfg, short, now)
			result := MultiWindowBurn{
				Service: cfg.Service, Environment: cfg.Environment, SLO: definition.Name,
				Tier: tier.Name, Severity: tier.Severity,
				LongBurn: longReport.BurnRate, ShortBurn: shortReport.BurnRate,
			}
			result.Indeterminate = longReport.State == StateIndeterminate || shortReport.State == StateIndeterminate
			result.Firing = !result.Indeterminate && result.LongBurn >= tier.Threshold && result.ShortBurn >= tier.Threshold
			results = append(results, result)
		}
	}
	return results, nil
}

func replaceWindow(query, oldWindow, newWindow string) string {
	return strings.ReplaceAll(query, "["+oldWindow+"]", "["+newWindow+"]")
}
