package helpers

import (
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func builderQueryForAggregationColumn(temporality v3.Temporality, timeAggregation v3.TimeAggregation) *v3.BuilderQuery {
	return &v3.BuilderQuery{
		QueryName:    "A",
		StepInterval: 60,
		DataSource:   v3.DataSourceMetrics,
		AggregateAttribute: v3.AttributeKey{
			Key:      "http_requests_total",
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyTypeUnspecified,
			IsColumn: true,
		},
		Temporality:     temporality,
		TimeAggregation: timeAggregation,
		Expression:      "A",
	}
}

func TestAggregationColumnForSamplesTable(t *testing.T) {
	// one hour range -> distributed_samples_v4,
	// two day range -> distributed_samples_v4_agg_5m,
	// eight day range -> distributed_samples_v4_agg_30m
	oneHour := int64(3_600_000)
	twoDays := int64(172_800_000)
	eightDays := int64(691_200_000)

	testCases := []struct {
		name            string
		temporality     v3.Temporality
		timeAggregation v3.TimeAggregation
		start           int64
		end             int64
		expected        string
	}{
		{
			// Exact shape of the metric details -> explorer redirect which
			// hardcodes an empty temporality while setting a time aggregation.
			// See https://github.com/SigNoz/signoz/issues/8912
			name:            "unset temporality with rate falls back to unspecified mapping",
			temporality:     "",
			timeAggregation: v3.TimeAggregationRate,
			start:           0,
			end:             oneHour,
			expected:        "sum(value)",
		},
		{
			name:            "unset temporality with sum falls back to unspecified mapping",
			temporality:     "",
			timeAggregation: v3.TimeAggregationSum,
			start:           0,
			end:             oneHour,
			expected:        "sum(value)",
		},
		{
			name:            "unset temporality with rate on 5m agg table",
			temporality:     "",
			timeAggregation: v3.TimeAggregationRate,
			start:           0,
			end:             twoDays,
			expected:        "sum(sum)",
		},
		{
			name:            "unset time aggregation defaults to anyLast on raw samples table",
			temporality:     v3.Cumulative,
			timeAggregation: "",
			start:           0,
			end:             oneHour,
			expected:        "anyLast(value)",
		},
		{
			name:            "unset time aggregation defaults to anyLast on 5m agg table",
			temporality:     v3.Delta,
			timeAggregation: "",
			start:           0,
			end:             twoDays,
			expected:        "anyLast(last)",
		},
		{
			name:            "unset time aggregation defaults to anyLast on 30m agg table",
			temporality:     v3.Unspecified,
			timeAggregation: "",
			start:           0,
			end:             eightDays,
			expected:        "anyLast(last)",
		},
		{
			name:            "unrecognized time aggregation defaults to anyLast",
			temporality:     v3.Cumulative,
			timeAggregation: "nonsense",
			start:           0,
			end:             oneHour,
			expected:        "anyLast(value)",
		},
		{
			name:            "both temporality and time aggregation unset",
			temporality:     "",
			timeAggregation: "",
			start:           0,
			end:             oneHour,
			expected:        "anyLast(value)",
		},
		// regression: previously supported combinations are unchanged
		{
			name:            "delta rate still sums values",
			temporality:     v3.Delta,
			timeAggregation: v3.TimeAggregationRate,
			start:           0,
			end:             oneHour,
			expected:        "sum(value)",
		},
		{
			name:            "cumulative rate still takes max",
			temporality:     v3.Cumulative,
			timeAggregation: v3.TimeAggregationRate,
			start:           0,
			end:             oneHour,
			expected:        "max(value)",
		},
		{
			name:            "cumulative sum still sums values",
			temporality:     v3.Cumulative,
			timeAggregation: v3.TimeAggregationSum,
			start:           0,
			end:             oneHour,
			expected:        "sum(value)",
		},
		{
			name:            "unspecified avg on 5m agg table still averages",
			temporality:     v3.Unspecified,
			timeAggregation: v3.TimeAggregationAvg,
			start:           0,
			end:             twoDays,
			expected:        "sum(sum) / sum(count)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mq := builderQueryForAggregationColumn(tc.temporality, tc.timeAggregation)
			column := AggregationColumnForSamplesTable(tc.start, tc.end, mq)
			require.NotEmpty(t, column, "aggregation column must never be empty")
			assert.Equal(t, tc.expected, column)
		})
	}
}
