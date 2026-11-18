package aiobservabilitytypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// statsLookback reaches into the previous day; the metadata store rounds
	// the start down to a day boundary.
	statsLookback = 24 * time.Hour
	// statsModelValuesLimit caps the model list, which also feeds the
	// unmapped model count. One value is enough for the other keys.
	statsModelValuesLimit = 100
)

// statsAttributeKeys are the gen_ai span attributes whose recent presence the
// stats reporter tracks under telemetry.traces.<key>.exists.
var statsAttributeKeys = []string{GenAIRequestModel, GenAIToolName, GenAIAgentName}

// StatsFieldValueSelectors look up each tracked attribute's string values
// since the start of the previous day.
func StatsFieldValueSelectors(now time.Time) []*telemetrytypes.FieldValueSelector {
	selectors := make([]*telemetrytypes.FieldValueSelector, 0, len(statsAttributeKeys))
	for _, key := range statsAttributeKeys {
		limit := 1
		if key == GenAIRequestModel {
			limit = statsModelValuesLimit
		}
		selectors = append(selectors, &telemetrytypes.FieldValueSelector{
			FieldKeySelector: &telemetrytypes.FieldKeySelector{
				StartUnixMilli: now.Add(-statsLookback).UnixMilli(),
				Signal:         telemetrytypes.SignalTraces,
				FieldContext:   telemetrytypes.FieldContextAttribute,
				FieldDataType:  telemetrytypes.FieldDataTypeString,
				Name:           key,
			},
			Limit: limit,
		})
	}
	return selectors
}

// NewStatsFromFieldValues reports whether each looked-up key had a value. Keys
// absent from values are left out, so a failed lookup never reports false.
func NewStatsFromFieldValues(values map[string]*telemetrytypes.TelemetryFieldValues) map[string]any {
	stats := make(map[string]any, len(values))
	for _, key := range statsAttributeKeys {
		if fieldValues := values[key]; fieldValues != nil {
			stats["telemetry.traces."+key+".exists"] = len(fieldValues.StringValues) > 0
		}
	}
	return stats
}
