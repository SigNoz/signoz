package slo

import (
	"context"
	"fmt"
	"time"
)

type ScalarQuerier interface {
	Scalar(context.Context, string, uint64, uint64) (float64, error)
}

type CompletenessGate interface {
	Check(context.Context, GateRequest) (GateResult, error)
}

type Engine struct {
	Scalar ScalarQuerier
	Gate   CompletenessGate
	Now    func() time.Time
}

func NewEngine(scalar ScalarQuerier, gate CompletenessGate) *Engine {
	return &Engine{Scalar: scalar, Gate: gate, Now: time.Now}
}

func (e *Engine) Evaluate(ctx context.Context, cfg Config, now time.Time) ([]Report, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if e.Scalar == nil {
		return nil, fmt.Errorf("SLO scalar querier is required")
	}
	if now.IsZero() {
		now = e.Now()
	}
	reports := make([]Report, 0, len(cfg.SLOs))
	for _, definition := range cfg.SLOs {
		reports = append(reports, e.evaluate(ctx, cfg, definition, now))
	}
	return reports, nil
}

func (e *Engine) evaluate(ctx context.Context, cfg Config, definition Definition, now time.Time) Report {
	duration, err := WindowDuration(definition.Window)
	report := Report{
		SchemaVersion: "1.0",
		Name:          definition.Name,
		Service:       cfg.Service,
		Environment:   cfg.Environment,
		Type:          definition.Type,
		Window:        definition.Window,
		Target:        definition.NormalizedTarget(),
		Completeness:  1,
		Gate:          GateResult{Coverage: 1, QueryComplete: true, Trusted: true},
	}
	if err != nil {
		return indeterminate(report, err)
	}

	if definition.RequiresCompleteness {
		if e.Gate == nil {
			return indeterminate(report, fmt.Errorf("completeness gate is not configured"))
		}
		dependencies := definition.Dependencies
		if len(dependencies) == 0 && cfg.Completeness != nil {
			dependencies = cfg.Completeness.ExpectedMetrics
		}
		serviceLabel, environmentLabel := cfg.MetricLabels()
		gateResult, gateErr := e.Gate.Check(ctx, GateRequest{
			Service:          cfg.Service,
			Environment:      cfg.Environment,
			Window:           duration,
			Dependencies:     dependencies,
			ServiceLabel:     serviceLabel,
			EnvironmentLabel: environmentLabel,
		})
		if gateErr != nil {
			return indeterminate(report, gateErr)
		}
		gateResult.Trusted = gateResult.QueryComplete && gateResult.Coverage >= cfg.GateThreshold(definition)
		report.Gate = gateResult
		report.Completeness = gateResult.Coverage
		if !gateResult.Trusted {
			return indeterminate(report, fmt.Errorf("telemetry completeness is below the SLO gate"))
		}
	}

	start := uint64(now.Add(-duration).UnixMilli())
	end := uint64(now.UnixMilli())
	sli, queryErr := evaluateSLI(ctx, e.Scalar, cfg, definition, start, end)
	if queryErr != nil {
		return indeterminate(report, queryErr)
	}
	report.SLI = sli
	if sli >= report.Target {
		report.State = StateHealthy
	} else {
		report.State = StateUnhealthy
	}
	report.BurnRate = BurnRate(1-sli, report.Target)
	report.ErrorBudgetRemaining = RemainingBudget(1-sli, report.Target)
	return report
}

func indeterminate(report Report, err error) Report {
	report.State = StateIndeterminate
	report.Error = err.Error()
	report.Gate.Trusted = false
	return report
}
