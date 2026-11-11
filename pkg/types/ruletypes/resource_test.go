package ruletypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewFieldResources(t *testing.T) {
	testCases := []struct {
		name      string
		telemetry []coretypes.Resource
		wantKinds []coretypes.Kind
		wantErr   bool
	}{
		{
			name:      "Logs_LogsField",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceLogs},
			wantKinds: []coretypes.Kind{coretypes.KindLogsField},
		},
		{
			name:      "AuditLogs_LogsField",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceAuditLogs},
			wantKinds: []coretypes.Kind{coretypes.KindLogsField},
		},
		{
			name:      "Traces_TracesField",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceTraces},
			wantKinds: []coretypes.Kind{coretypes.KindTracesField},
		},
		{
			name:      "Metrics_MetricsField",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceMetrics},
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "MeterMetrics_MetricsField",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceMeterMetrics},
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "MetricsAndMeterMetrics_Deduped",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceMetrics, coretypes.ResourceTelemetryResourceMeterMetrics},
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "AllSignals_AllThreeFields",
			telemetry: []coretypes.Resource{coretypes.ResourceTelemetryResourceLogs, coretypes.ResourceTelemetryResourceTraces, coretypes.ResourceTelemetryResourceMetrics},
			wantKinds: []coretypes.Kind{coretypes.KindLogsField, coretypes.KindTracesField, coretypes.KindMetricsField},
		},
		{
			name:      "Empty_Empty",
			wantKinds: []coretypes.Kind{},
		},
		{
			name:      "FieldKind_Errors",
			telemetry: []coretypes.Resource{coretypes.ResourceMetaResourceLogsField},
			wantErr:   true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			telemetry := make([]coretypes.ResourceWithID, 0, len(testCase.telemetry))
			for _, resource := range testCase.telemetry {
				telemetry = append(telemetry, coretypes.ResourceWithID{Resource: resource})
			}

			resources, err := NewFieldResources(telemetry)

			if testCase.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			kinds := make([]coretypes.Kind, 0, len(resources))
			for _, resource := range resources {
				kinds = append(kinds, resource.Resource.Kind())
			}
			assert.Equal(t, testCase.wantKinds, kinds)
		})
	}
}
