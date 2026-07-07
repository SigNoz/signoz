package telemetrytypes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSelectorSegment(t *testing.T) {
	assert.Len(t, selectorSegment("service.name = 'frontend'"), 16)
	assert.Equal(t,
		selectorSegment("service.name    =  'frontend'"),
		selectorSegment("service.name = 'frontend'"),
	)
	assert.NotEqual(t,
		selectorSegment("service.name = 'frontend'"),
		selectorSegment("service.name = 'backend'"),
	)
	assert.Equal(t, selectorSegment(""), selectorSegment("  "))
}

func TestPrefixSelector(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.GenerateUUID()
	metricSegment := selectorSegment("http.server.duration.count")
	whereSegment := selectorSegment("service.name = 'frontend'")

	testCases := []struct {
		name     string
		id       string
		expected []string
	}{
		{
			name: "two segments",
			id:   "builder_query/" + metricSegment + "/" + whereSegment,
			expected: []string{
				"builder_query/" + metricSegment + "/" + whereSegment,
				"builder_query/" + metricSegment + "/*",
				"builder_query/*",
				"*",
			},
		},
		{
			name: "one segment",
			id:   "builder_query/" + whereSegment,
			expected: []string{
				"builder_query/" + whereSegment,
				"builder_query/*",
				"*",
			},
		},
		{
			name:     "query type only",
			id:       "promql",
			expected: []string{"promql", "*"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			selectors, err := PrefixSelector(ctx, coretypes.ResourceTelemetryResourceMetrics, testCase.id, orgID)
			require.NoError(t, err)

			values := make([]string, len(selectors))
			for idx, selector := range selectors {
				values[idx] = selector.String()
			}
			assert.Equal(t, testCase.expected, values)
		})
	}

	_, err := PrefixSelector(ctx, coretypes.ResourceTelemetryResourceMetrics, "", orgID)
	assert.Error(t, err)
}
