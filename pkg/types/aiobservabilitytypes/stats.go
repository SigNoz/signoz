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

// StatsFieldValueSelectors look up each tracked attribute's string values
// since the start of the previous day.
func StatsFieldValueSelectors(now time.Time) []*telemetrytypes.FieldValueSelector {
	selectors := make([]*telemetrytypes.FieldValueSelector, 0, len(statsAttributeKeys))
	for _, key := range statsAttributeKeys {
		selectors = append(selectors, &telemetrytypes.FieldValueSelector{
			FieldKeySelector: &telemetrytypes.FieldKeySelector{
				StartUnixMilli: now.Add(-statsLookback).UnixMilli(),
				Signal:         telemetrytypes.SignalTraces,
				FieldContext:   telemetrytypes.FieldContextAttribute,
				FieldDataType:  telemetrytypes.FieldDataTypeString,
				Name:           key,
			},
			Limit: statsValuesLimit,
		})
	}
	return selectors
}

// NewStatsFromFieldValues counts the distinct values of each looked-up key.
// Keys absent from values are left out, so a failed lookup never reports zero.
func NewStatsFromFieldValues(values map[string]*telemetrytypes.TelemetryFieldValues) map[string]any {
	stats := make(map[string]any, len(values))
	for _, key := range statsAttributeKeys {
		if fieldValues := values[key]; fieldValues != nil {
			stats["telemetry.traces."+key+".count"] = int64(len(fieldValues.StringValues))
		}
	}
	return stats
}
