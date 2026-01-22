package querybuilder

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseBucketCount(t *testing.T) {
	tests := []struct {
		name          string
		expr          string
		expectedCount int
		expectedError bool
	}{
		{
			name:          "heatmap without bucket count",
			expr:          "heatmap(duration_nano)",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "heatmap with valid bucket count",
			expr:          "heatmap(duration_nano, 20)",
			expectedCount: 20,
			expectedError: false,
		},
		{
			name:          "heatmap with bucket count 50",
			expr:          "heatmap(http.status_code, 50)",
			expectedCount: 50,
			expectedError: false,
		},
		{
			name:          "heatmap with bucket count 1",
			expr:          "heatmap(field, 1)",
			expectedCount: 1,
			expectedError: false,
		},
		{
			name:          "heatmap with bucket count exceeding max",
			expr:          "heatmap(duration_nano, 500)",
			expectedCount: 250, // maxBuckets
			expectedError: false,
		},
		{
			name:          "heatmap with zero bucket count",
			expr:          "heatmap(duration_nano, 0)",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "heatmap with negative bucket count",
			expr:          "heatmap(duration_nano, -5)",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "non-heatmap function",
			expr:          "count()",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "histogram function",
			expr:          "histogram(duration_nano, 30)",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "heatmap with invalid bucket count string",
			expr:          "heatmap(duration_nano, 'invalid')",
			expectedCount: 0,
			expectedError: true,
		},
		{
			name:          "distribution without bucket count",
			expr:          "distribution(duration_nano)",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "distribution with valid bucket count",
			expr:          "distribution(duration_nano, 15)",
			expectedCount: 15,
			expectedError: false,
		},
		{
			name:          "distribution with bucket count exceeding max",
			expr:          "distribution(duration_nano, 300)",
			expectedCount: 250, // maxBuckets
			expectedError: false,
		},
		{
			name:          "empty expression",
			expr:          "",
			expectedCount: 0,
			expectedError: false,
		},
		{
			name:          "invalid SQL",
			expr:          "heatmap(duration_nano",
			expectedCount: 0,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			count, err := ParseBucketCount(tt.expr)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expectedCount, count)
			}
		})
	}
}
