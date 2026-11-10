package telemetrymetadata

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/stretchr/testify/assert"
)

func TestResolveMetricType(t *testing.T) {
	testCases := []struct {
		description        string
		inputMetricType    metrictypes.Type
		inputIsMonotonic   bool
		inputTemporality   metrictypes.Temporality
		expectedMetricType metrictypes.Type
	}{
		{
			description:        "delta non-monotonic sum stays a sum",
			inputMetricType:    metrictypes.SumType,
			inputIsMonotonic:   false,
			inputTemporality:   metrictypes.Delta,
			expectedMetricType: metrictypes.SumType,
		},
		{
			description:        "cumulative non-monotonic sum becomes a gauge",
			inputMetricType:    metrictypes.SumType,
			inputIsMonotonic:   false,
			inputTemporality:   metrictypes.Cumulative,
			expectedMetricType: metrictypes.GaugeType,
		},
		{
			description:        "cumulative monotonic sum stays a sum",
			inputMetricType:    metrictypes.SumType,
			inputIsMonotonic:   true,
			inputTemporality:   metrictypes.Cumulative,
			expectedMetricType: metrictypes.SumType,
		},
		{
			description:        "delta monotonic sum stays a sum",
			inputMetricType:    metrictypes.SumType,
			inputIsMonotonic:   true,
			inputTemporality:   metrictypes.Delta,
			expectedMetricType: metrictypes.SumType,
		},
		{
			description:        "gauge is unaffected by monotonicity",
			inputMetricType:    metrictypes.GaugeType,
			inputIsMonotonic:   false,
			inputTemporality:   metrictypes.Unspecified,
			expectedMetricType: metrictypes.GaugeType,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			assert.Equal(
				t,
				testCase.expectedMetricType,
				resolveMetricType(testCase.inputMetricType, testCase.inputIsMonotonic, testCase.inputTemporality),
			)
		})
	}
}
