package alertmanagerserver

import "github.com/prometheus/client_golang/prometheus"

type DispatcherMetrics struct {
	aggrGroups            prometheus.Gauge
	processingDuration    prometheus.Summary
	aggrGroupLimitReached prometheus.Counter
}

// NewDispatcherMetrics returns a new registered DispatchMetrics.
// todo(aniketio-ctrl): change prom metrics to otel metrics
func NewDispatcherMetrics(registerLimitMetrics bool, r prometheus.Registerer) *DispatcherMetrics {
	m := DispatcherMetrics{
		aggrGroups: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "signoz_alertmanager_dispatcher_aggregation_groups",
				Help: "Number of active aggregation groups",
			},
		),
		processingDuration: prometheus.NewSummary(
			prometheus.SummaryOpts{
				Name: "signoz_alertmanager_dispatcher_alert_processing_duration_seconds",
				Help: "Summary of latencies for the processing of alerts.",
			},
		),
		aggrGroupLimitReached: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "signoz_alertmanager_dispatcher_aggregation_group_limit_reached_total",
				Help: "Number of times when dispatcher failed to create new aggregation group due to limit.",
			},
		),
	}

	if r != nil {
		r.MustRegister(m.aggrGroups, m.processingDuration)
		if registerLimitMetrics {
			r.MustRegister(m.aggrGroupLimitReached)
		}
	}

	return &m
}
