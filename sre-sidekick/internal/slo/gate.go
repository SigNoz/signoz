package slo

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// MetricPresenceGate is the first real gate implementation. It checks that
// every configured dependency has data for the requested service, environment,
// and window. Track A will later provide a richer dependency-aware gate.
type MetricPresenceGate struct {
	Scalar           ScalarQuerier
	Expected         []string
	ServiceLabel     string
	EnvironmentLabel string
	Now              func() time.Time
}

func NewMetricPresenceGate(scalar ScalarQuerier, expected []string) *MetricPresenceGate {
	return &MetricPresenceGate{
		Scalar:           scalar,
		Expected:         expected,
		ServiceLabel:     "service_name",
		EnvironmentLabel: "environment",
		Now:              time.Now,
	}
}

type GateRequest struct {
	Service          string
	Environment      string
	Window           time.Duration
	Dependencies     []string
	ServiceLabel     string
	EnvironmentLabel string
}

func (g *MetricPresenceGate) Check(ctx context.Context, request GateRequest) (GateResult, error) {
	metrics := request.Dependencies
	if len(metrics) == 0 {
		metrics = g.Expected
	}
	if len(metrics) == 0 {
		return GateResult{Coverage: 1, QueryComplete: true}, nil
	}
	if g.Scalar == nil {
		return GateResult{QueryComplete: false, Trusted: false, Reason: "scalar querier is not configured"}, nil
	}
	now := g.Now()
	start := uint64(now.Add(-request.Window).UnixMilli())
	end := uint64(now.UnixMilli())
	serviceLabel := request.ServiceLabel
	if serviceLabel == "" {
		serviceLabel = g.ServiceLabel
	}
	environmentLabel := request.EnvironmentLabel
	if environmentLabel == "" {
		environmentLabel = g.EnvironmentLabel
	}
	present := 0
	for _, metric := range metrics {
		expr := scopedMetric(metric, request.Service, request.Environment, serviceLabel, environmentLabel)
		presenceQuery := fmt.Sprintf(
			"count(count_over_time(%s[%s]))",
			expr,
			prometheusDuration(request.Window),
		)
		value, err := g.Scalar.Scalar(ctx, presenceQuery, start, end)
		if err != nil {
			return GateResult{
				Coverage:      float64(present) / float64(len(metrics)),
				QueryComplete: false,
				Trusted:       false,
				Reason:        fmt.Sprintf("dependency %s query failed: %v", metric, err),
			}, nil
		}
		if value > 0 {
			present++
		}
	}
	coverage := float64(present) / float64(len(metrics))
	return GateResult{
		Coverage:      coverage,
		QueryComplete: true,
		Reason:        fmt.Sprintf("%d of %d dependencies have data", present, len(metrics)),
	}, nil
}

func prometheusDuration(duration time.Duration) string {
	if duration%time.Second == 0 {
		return strconv.FormatInt(int64(duration/time.Second), 10) + "s"
	}
	if duration < time.Millisecond {
		return "1ms"
	}
	return strconv.FormatInt(int64(duration/time.Millisecond), 10) + "ms"
}

func scopedMetric(metric, service, environment, serviceLabel, environmentLabel string) string {
	metric = strings.TrimSpace(metric)
	if serviceLabel == "" {
		serviceLabel = "service_name"
	}
	if environmentLabel == "" {
		environmentLabel = "environment"
	}
	serviceFilter := fmt.Sprintf(`%s="%s"`, serviceLabel, escape(service))
	environmentFilter := fmt.Sprintf(`%s="%s"`, environmentLabel, escape(environment))
	open := strings.Index(metric, "{")
	if open >= 0 {
		close := strings.Index(metric[open:], "}")
		if close >= 0 {
			close += open
			inside := strings.TrimSpace(metric[open+1 : close])
			filters := []string{inside}
			if !strings.Contains(inside, serviceLabel+"=") {
				filters = append(filters, serviceFilter)
			}
			if !strings.Contains(inside, environmentLabel+"=") {
				filters = append(filters, environmentFilter)
			}
			return metric[:open] + "{" + strings.Join(nonEmpty(filters), ",") + "}" + metric[close+1:]
		}
	}
	return fmt.Sprintf("%s{%s,%s}", metric, serviceFilter, environmentFilter)
}

func nonEmpty(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			result = append(result, value)
		}
	}
	return result
}

func escape(value string) string {
	return strings.ReplaceAll(value, `"`, `\"`)
}
