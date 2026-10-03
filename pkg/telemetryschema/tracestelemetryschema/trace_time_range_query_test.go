package tracestelemetryschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildTraceTimeRangeQueries(t *testing.T) {
	tests := []struct {
		name                 string
		searchFromMS         uint64
		searchToMS           uint64
		expectBoundedQuery   bool
		expectedBoundedMatch []string
	}{
		{
			name:                 "both bounds provided",
			searchFromMS:         1700000000000,
			searchToMS:           1700003600000,
			expectBoundedQuery:   true,
			expectedBoundedMatch: []string{"end >= toDateTime64(1700000000000 / 1000.0, 3)", "end <= toDateTime64(1700003600000 / 1000.0, 3)", "uniqExact(trace_id)"},
		},
		{
			name:                 "only from bound provided",
			searchFromMS:         1700000000000,
			searchToMS:           0,
			expectBoundedQuery:   false,
			expectedBoundedMatch: nil,
		},
		{
			name:                 "no bounds provided",
			searchFromMS:         0,
			searchToMS:           0,
			expectBoundedQuery:   false,
			expectedBoundedMatch: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			boundedQuery, unboundedQuery := buildTraceTimeRangeQueries("?", tt.searchFromMS, tt.searchToMS)

			// Unbounded query is always returned and must not have time bounds
			assert.NotEmpty(t, unboundedQuery)
			assert.Contains(t, unboundedQuery, "count()")
			assert.NotContains(t, unboundedQuery, "toDateTime")

			if !tt.expectBoundedQuery {
				assert.Empty(t, boundedQuery)
			} else {
				assert.NotEmpty(t, boundedQuery)
				for _, match := range tt.expectedBoundedMatch {
					assert.Contains(t, boundedQuery, match)
				}
			}
		})
	}
}
