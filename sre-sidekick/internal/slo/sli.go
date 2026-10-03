package slo

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var ErrNoData = errors.New("no data in SLO window")

func evaluateSLI(ctx context.Context, querier ScalarQuerier, cfg Config, definition Definition, start, end uint64) (float64, error) {
	goodQuery, totalQuery, err := deriveQueries(cfg, definition)
	if err != nil {
		return 0, err
	}
	total, err := querier.Scalar(ctx, totalQuery, start, end)
	if err != nil {
		return 0, fmt.Errorf("total query: %w", err)
	}
	if total <= 0 {
		return 0, ErrNoData
	}
	good, err := querier.Scalar(ctx, goodQuery, start, end)
	if err != nil {
		return 0, fmt.Errorf("good query: %w", err)
	}
	if good < 0 {
		good = 0
	}
	if good > total {
		good = total
	}
	return good / total, nil
}

func deriveQueries(cfg Config, definition Definition) (string, string, error) {
	switch definition.Type {
	case SLITypeRatio, SLITypeCompleteness, SLITypeGroundedAnswers:
		return definition.GoodQuery, definition.TotalQuery, nil
	case SLITypeLatencyThreshold:
		le := strconv.FormatFloat(definition.ThresholdMS/1000, 'f', -1, 64)
		window := strings.TrimSpace(definition.Window)
		serviceLabel, environmentLabel := cfg.MetricLabels()
		bucket, err := histogramMetric(definition.LatencyMetric, "_bucket")
		if err != nil {
			return "", "", err
		}
		count, err := histogramMetric(definition.LatencyMetric, "_count")
		if err != nil {
			return "", "", err
		}
		bucket = scopedMetric(bucket, cfg.Service, cfg.Environment, serviceLabel, environmentLabel)
		bucket = addMatcher(bucket, fmt.Sprintf(`le="%s"`, le))
		count = scopedMetric(count, cfg.Service, cfg.Environment, serviceLabel, environmentLabel)
		good := fmt.Sprintf("sum(increase(%s[%s]))", bucket, window)
		total := fmt.Sprintf("sum(increase(%s[%s]))", count, window)
		return good, total, nil
	default:
		return "", "", fmt.Errorf("unsupported SLI type %q", definition.Type)
	}
}

func histogramMetric(metric, suffix string) (string, error) {
	metric = strings.TrimSpace(metric)
	if metric == "" {
		return "", fmt.Errorf("latency metric is empty")
	}
	if open := strings.Index(metric, "{"); open >= 0 {
		name := strings.TrimSpace(metric[:open])
		if name == "" {
			return "", fmt.Errorf("invalid latency metric %q", metric)
		}
		return name + suffix + metric[open:], nil
	}
	return metric + suffix, nil
}

func addMatcher(metric, matcher string) string {
	open := strings.Index(metric, "{")
	if open < 0 {
		return metric + "{" + matcher + "}"
	}
	close := strings.Index(metric[open:], "}")
	if close < 0 {
		return metric
	}
	close += open
	inside := strings.TrimSpace(metric[open+1 : close])
	if inside == "" {
		return metric[:open+1] + matcher + metric[close:]
	}
	return metric[:close] + "," + matcher + metric[close:]
}
