package telemetrymetadata

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// spanSearchScopeFieldValues is the suggestion set for a search-scope selector
// (isRoot, isEntryPoint), which only filters with true. ok is false for any
// other name.
func spanSearchScopeFieldValues(name, searchText string) (*telemetrytypes.TelemetryFieldValues, bool) {
	for scopeName := range tracestelemetryschema.SpanSearchScopeFields {
		if !strings.EqualFold(scopeName, name) {
			continue
		}
		values := &telemetrytypes.TelemetryFieldValues{}
		if needle := strings.ToLower(searchText); needle == "" || strings.Contains("true", needle) {
			values.BoolValues = []bool{true}
		}
		return values, true
	}
	return nil, false
}
