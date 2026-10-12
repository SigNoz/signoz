package ruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTracesExplorerPath(t *testing.T) {
	testCases := []struct {
		name      string
		alertType AlertType
		want      string
	}{
		{name: "Metric", alertType: AlertTypeMetric, want: "traces-explorer"},
		{name: "Traces", alertType: AlertTypeTraces, want: "traces-explorer"},
		{name: "Logs", alertType: AlertTypeLogs, want: "traces-explorer"},
		{name: "Exceptions", alertType: AlertTypeExceptions, want: "traces-explorer"},
		{name: "AITraces", alertType: AlertTypeAITraces, want: "ai-observability/explorer"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.alertType.TracesExplorerPath())
		})
	}
}
