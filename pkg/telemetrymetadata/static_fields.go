package telemetrymetadata

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func staticFieldMatchesAny(field telemetrytypes.TelemetryFieldKey, selectors []*telemetrytypes.FieldKeySelector) bool {
	for _, selector := range selectors {
		if selector.MatchesKey(&field) {
			return true
		}
	}
	return false
}
