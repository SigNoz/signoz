package aitelemetryschema

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// FieldKeys merges in the keys the metadata store cannot serve: the computed
// aggregates always, the gen_ai attributes only where ingestion has not.
func FieldKeys(keys map[string][]*telemetrytypes.TelemetryFieldKey, selector *telemetrytypes.FieldKeySelector) map[string][]*telemetrytypes.TelemetryFieldKey {
	for name, def := range TraceAggregateFields {
		if selector.MatchesKey(&def) {
			keys[name] = append(keys[name], &def)
		}
	}

	for name, def := range GenAIFields {
		if len(keys[name]) > 0 {
			continue
		}
		if selector.MatchesKey(&def) {
			keys[name] = []*telemetrytypes.TelemetryFieldKey{&def}
		}
	}

	return keys
}
