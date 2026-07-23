package slo

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var ErrNoData = errors.New("no data in SLO window")

func evaluateSLI(ctx context.Context, querier ScalarQuerier, definition Definition, start, end uint64) (float64, error) {
	goodQuery, totalQuery, err := deriveQueries(definition)
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

func deriveQueries(definition Definition) (string, string, error) {
	switch definition.Type {
	case SLITypeRatio, SLITypeCompleteness, SLITypeGroundedAnswers:
		return definition.GoodQuery, definition.TotalQuery, nil
	case SLITypeLatencyThreshold:
		le := strconv.FormatFloat(definition.ThresholdMS/1000, 'f', -1, 64)
		window := strings.TrimSpace(definition.Window)
		good := fmt.Sprintf("sum(increase(%s_bucket{le=\"%s\"}[%s]))", definition.LatencyMetric, le, window)
		total := fmt.Sprintf("sum(increase(%s_count[%s]))", definition.LatencyMetric, window)
		return good, total, nil
	default:
		return "", "", fmt.Errorf("unsupported SLI type %q", definition.Type)
	}
}
