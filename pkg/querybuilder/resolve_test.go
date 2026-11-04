package querybuilder_test

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// A key metadata does not report warns and the query runs, so in a select
// field, group by, order by, or aggregation every storage's fallback must read.
// The only failure allowed is invalid input for a context the signal does not
// serve.
func TestResolveColumn_UnknownKey(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	start := uint64(releaseTime.Add(24 * time.Hour).UnixNano())
	end := start + uint64(time.Hour.Nanoseconds())

	schemaMetadataStore := telemetrytypestest.NewMockSchemaMetadataStore(t)
	schemaMetadataStore.EXPECT().GetBaseColumnEvolutions(mock.Anything, telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute).Return(tracestelemetryschema.MockAttributeEvolutionData(releaseTime), nil).Maybe()

	testCases := []struct {
		name    string
		storage qbtypes.Storage
		query   qbtypes.QueryInfo
	}{
		{
			name:    "Logs",
			storage: logstelemetryschema.NewStorage(),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalLogs, StartNs: start, EndNs: end},
		},
		{
			name:    "Logs_JSONBody",
			storage: logstelemetryschema.NewStorage(),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalLogs, StartNs: start, EndNs: end, BodyJSONOn: true},
		},
		{
			name:    "Traces",
			storage: tracestelemetryschema.NewStorage(schemaMetadataStore),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalTraces, StartNs: start, EndNs: end},
		},
		{
			name:    "Traces_JSONAttributes",
			storage: tracestelemetryschema.NewStorage(schemaMetadataStore),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalTraces, StartNs: start, EndNs: end, TraceAttrsJSONOn: true},
		},
		{
			name:    "Metrics",
			storage: metricstelemetryschema.NewStorage(),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalMetrics, StartNs: start, EndNs: end},
		},
		{
			name:    "Audit",
			storage: audittelemetryschema.NewStorage(),
			query:   qbtypes.QueryInfo{Signal: telemetrytypes.SignalLogs, StartNs: start, EndNs: end},
		},
	}

	for _, testCase := range testCases {
		for _, value := range (telemetrytypes.FieldContext{}).Enum() {
			fieldContext, ok := value.(telemetrytypes.FieldContext)
			require.True(t, ok)

			t.Run(testCase.name+"_"+fieldContext.StringValue(), func(t *testing.T) {
				key := telemetrytypes.TelemetryFieldKey{Name: "unknown.key", FieldContext: fieldContext, Signal: testCase.query.Signal}

				_, err := querybuilder.ResolveColumn(context.Background(), testCase.query, testCase.storage, &key, telemetrytypes.FieldDataTypeUnspecified, map[string][]*telemetrytypes.TelemetryFieldKey{})
				if err != nil {
					assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "%v", err)
				}
			})
		}
	}
}
