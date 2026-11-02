package aiobservabilitytypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// statsValuesLimit caps each count, since the metadata store lists values
	// rather than counting them.
	statsValuesLimit = 1000
	// statsLookback reaches into the previous day; the metadata store rounds
	// the start down to a day boundary.
	statsLookback = 24 * time.Hour
)

// statsAttributeKeys are the gen_ai span attributes whose recent distinct
// values the stats reporter counts under telemetry.traces.<key>.count.
var statsAttributeKeys = []string{GenAIRequestModel, GenAIToolName, GenAIAgentName}

// StatsFieldValueSelectors look up each tracked attribute's values since the
// start of the previous day.
func StatsFieldValueSelectors(now time.Time) []*telemetrytypes.FieldValueSelector {
	selectors := make([]*telemetrytypes.FieldValueSelector, 0, len(statsAttributeKeys))
	for _, key := range statsAttributeKeys {
		selectors = append(selectors, &telemetrytypes.FieldValueSelector{
			FieldKeySelector: &telemetrytypes.FieldKeySelector{
				StartUnixMilli: now.Add(-statsLookback).UnixMilli(),
				Signal:         telemetrytypes.SignalTraces,
				FieldContext:   telemetrytypes.FieldContextAttribute,
				Name:           key,
			},
			Limit: statsValuesLimit,
		})
	}
	return selectors
}

// NewStatsFromFieldValues counts the distinct values returned per key.
func NewStatsFromFieldValues(values map[string]*telemetrytypes.TelemetryFieldValues) map[string]any {
	stats := make(map[string]any, len(statsAttributeKeys))
	for _, key := range statsAttributeKeys {
		count := 0
		if fieldValues := values[key]; fieldValues != nil {
			count = len(fieldValues.StringValues)
		}
		stats["telemetry.traces."+key+".count"] = int64(count)
	}
	return stats
}
