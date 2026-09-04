package querier

import (
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestBuilderQueryFingerprint(t *testing.T) {
	tests := []struct {
		name           string
		query          *builderQuery[qbtypes.MetricAggregation]
		expectInKey    []string
		notExpectInKey []string
	}{
		{
			name: "fingerprint includes shiftby when ShiftBy field is set",
			query: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 3600,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameTimeShift,
							Args: []qbtypes.FunctionArg{
								{Value: "3600"},
							},
						},
					},
				},
			},
			expectInKey:    []string{"shiftby=3600"},
			notExpectInKey: []string{"functions=", "timeshift", "absolute"},
		},
		{
			name: "fingerprint includes shiftby but not other functions",
			query: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 3600,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameTimeShift,
							Args: []qbtypes.FunctionArg{
								{Value: "3600"},
							},
						},
						{
							Name: qbtypes.FunctionNameAbsolute,
						},
					},
				},
			},
			expectInKey:    []string{"shiftby=3600"},
			notExpectInKey: []string{"functions=", "absolute"},
		},
		{
			name: "no shiftby in fingerprint when ShiftBy is zero",
			query: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 0,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameAbsolute,
						},
					},
				},
			},
			expectInKey:    []string{},
			notExpectInKey: []string{"shiftby=", "functions=", "absolute"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fingerprint := tt.query.Fingerprint()
			for _, expected := range tt.expectInKey {
				assert.True(t, strings.Contains(fingerprint, expected),
					"Expected fingerprint to contain '%s', got: %s", expected, fingerprint)
			}
			for _, notExpected := range tt.notExpectInKey {
				assert.False(t, strings.Contains(fingerprint, notExpected),
					"Expected fingerprint NOT to contain '%s', got: %s", notExpected, fingerprint)
			}
		})
	}
}

func TestBuilderQueryFingerprintQueryType(t *testing.T) {
	spec := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: 60 * time.Second},
		Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
		Filter:       &qbtypes.Filter{Expression: "gen_ai.request.model EXISTS"},
	}
	regular := &builderQuery[qbtypes.TraceAggregation]{
		queryType: qbtypes.QueryTypeBuilder,
		kind:      qbtypes.RequestTypeTimeSeries,
		spec:      spec,
	}
	ai := &builderQuery[qbtypes.TraceAggregation]{
		queryType: qbtypes.QueryTypeBuilderAI,
		kind:      qbtypes.RequestTypeTimeSeries,
		spec:      spec,
	}

	assert.True(t, strings.HasPrefix(regular.Fingerprint(), qbtypes.QueryTypeBuilder.StringValue()+"&"))
	assert.Empty(t, ai.Fingerprint())
}

func TestBuilderQueryFingerprintHeatmapBucketing(t *testing.T) {
	coarseLogScale := 1

	testCases := []struct {
		description   string
		left          *builderQuery[qbtypes.MetricAggregation]
		right         *builderQuery[qbtypes.MetricAggregation]
		expectedEqual bool
	}{
		{
			// ResolveBucketOptions pins LogScale to MaxLogScale whatever the
			// caller asked for, so the two are indistinguishable here by design
			description: "a coarser logScale reads the same cache entry",
			left: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLog, LogScale: qbtypes.MaxLogScale, NumBuckets: qbtypes.DefaultNumBuckets},
					}},
				},
			},
			right: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLog, LogScale: qbtypes.MaxLogScale, NumBuckets: qbtypes.DefaultNumBuckets},
					}},
				},
			},
			expectedEqual: true,
		},
		{
			description: "linear separates on maxValue",
			left: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLinear, MaxValue: 500, NumBuckets: 25},
					}},
				},
			},
			right: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLinear, MaxValue: 800, NumBuckets: 25},
					}},
				},
			},
			expectedEqual: false,
		},
		{
			description: "linear separates on numBuckets",
			left: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLinear, MaxValue: 500, NumBuckets: 25},
					}},
				},
			},
			right: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLinear, MaxValue: 500, NumBuckets: 40},
					}},
				},
			},
			expectedEqual: false,
		},
		{
			description: "linear and log are separate entries",
			left: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLinear, MaxValue: 500, NumBuckets: 25},
					}},
				},
			},
			right: &builderQuery[qbtypes.MetricAggregation]{
				queryType: qbtypes.QueryTypeBuilder,
				kind:      qbtypes.RequestTypeHeatmap,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						HeatmapBucketing: &qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLog, LogScale: qbtypes.MaxLogScale, NumBuckets: qbtypes.DefaultNumBuckets},
					}},
				},
			},
			expectedEqual: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			if testCase.expectedEqual {
				assert.Equal(t, testCase.left.Fingerprint(), testCase.right.Fingerprint())
				return
			}
			assert.NotEqual(t, testCase.left.Fingerprint(), testCase.right.Fingerprint())
		})
	}

	t.Run("a coarser scale never reaches the axis clickhouse builds", func(t *testing.T) {
		finest := (&qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLog, Spec: qbtypes.LogBucketsSpec{}}).ToHeatmapBucketing()
		coarse := (&qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLog, Spec: qbtypes.LogBucketsSpec{Scale: &coarseLogScale}}).ToHeatmapBucketing()

		assert.Equal(t, finest, coarse)
	})

	t.Run("a histogram folds in no bucket options at all", func(t *testing.T) {
		// resolveHeatmapBucketing leaves histograms nil, so bucketOptions sent
		// alongside one must not fragment its cache
		histogram := &builderQuery[qbtypes.MetricAggregation]{
			queryType: qbtypes.QueryTypeBuilder,
			kind:      qbtypes.RequestTypeHeatmap,
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{{
					MetricName: "signoz_latency",
					Type:       metrictypes.HistogramType,
				}},
			},
		}

		fingerprint := histogram.Fingerprint()
		assert.NotContains(t, fingerprint, qbtypes.BucketsKindLog.StringValue())
		assert.NotContains(t, fingerprint, qbtypes.BucketsKindLinear.StringValue())
	})
}

func TestMakeBucketsOrder(t *testing.T) {
	// Test that makeBuckets returns buckets in reverse chronological order by default
	// Using milliseconds as input - need > 1 hour range to get multiple buckets
	now := uint64(1700000000000) // Some timestamp in ms
	startMS := now
	endMS := now + uint64(10*60*60*1000) // 10 hours later

	buckets := makeBuckets(startMS, endMS)

	// Should have multiple buckets for a 10 hour range
	assert.True(t, len(buckets) > 1, "Should have multiple buckets for 10 hour range, got %d", len(buckets))

	// Log buckets for debugging
	t.Logf("Generated %d buckets:", len(buckets))
	for i, b := range buckets {
		durationMs := (b.toNS - b.fromNS) / 1e6
		t.Logf("Bucket %d: duration=%dms", i, durationMs)
	}

	// Verify buckets are in reverse chronological order (newest to oldest)
	for i := 0; i < len(buckets)-1; i++ {
		assert.True(t, buckets[i].toNS > buckets[i+1].toNS,
			"Bucket %d end should be after bucket %d end", i, i+1)
		assert.Equal(t, buckets[i].fromNS, buckets[i+1].toNS,
			"Bucket %d start should equal bucket %d end (continuous buckets)", i, i+1)
	}

	// First bucket should end at endNS (converted to nanoseconds)
	expectedEndNS := querybuilder.ToNanoSecs(endMS)
	assert.Equal(t, expectedEndNS, buckets[0].toNS)

	// Last bucket should start at startNS (converted to nanoseconds)
	expectedStartNS := querybuilder.ToNanoSecs(startMS)
	assert.Equal(t, expectedStartNS, buckets[len(buckets)-1].fromNS)
}
