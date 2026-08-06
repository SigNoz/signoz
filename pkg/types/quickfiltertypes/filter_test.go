package quickfiltertypes

import (
	"encoding/json"
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultTraceQuickFiltersUseCurrentEnvironmentName(t *testing.T) {
	filters, err := NewDefaultQuickFilter(valuer.GenerateUUID())
	require.NoError(t, err)

	traceSignals := map[string]bool{
		SignalTraces.StringValue():        true,
		SignalApiMonitoring.StringValue(): true,
		SignalExceptions.StringValue():    true,
	}
	for _, filter := range filters {
		if !traceSignals[filter.Signal.StringValue()] {
			continue
		}
		var keys []v3.AttributeKey
		require.NoError(t, json.Unmarshal([]byte(filter.Filter), &keys))
		found := false
		for _, key := range keys {
			if key.Key == "deployment.environment.name" {
				found = true
			}
			assert.NotEqual(t, "deployment.environment", key.Key)
		}
		assert.True(t, found, "missing environment quick filter for %s", filter.Signal.StringValue())
	}
}
