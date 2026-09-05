package querybuildertypesv5

import (
	"encoding/json"
	"math"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateHeatmapRequest(t *testing.T) {
	testCases := []struct {
		description         string
		request             QueryRangeRequest
		expectedErrContains string
	}{
		{
			description: "a single metrics builder query with increase and sum is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
					},
				}}},
			},
		},
		{
			// the axis comes from the `le` labels, so the space aggregation has
			// nothing left to pick out and a percentile draws the same heatmap a
			// count would
			description: "percentile space aggregation is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
						}},
					},
				}}},
			},
		},
		{
			// the statement builder strips `le` from a histogram's groupBy before
			// re-adding it for the bucket CTE, the same as any other histogram
			// query, so it needs no heatmap rule of its own
			description: "le in groupBy is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
						GroupBy: []GroupByKey{{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "le"},
						}},
					},
				}}},
			},
		},
		{
			description: "having is refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
						Having: &Having{Expression: "sum(http.server.request.duration) > 10"},
					},
				}}},
			},
			expectedErrContains: "having is not supported",
		},
		{
			description: "functions are refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
						Functions: []Function{{Name: FunctionNameAbsolute}},
					},
				}}},
			},
			expectedErrContains: "functions are not supported",
		},
		{
			// a promql histogram carries `le` through the matrix as an ordinary
			// label, which is the same axis the builder's histogram path reads
			description: "a promql query is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypePromQL,
					Spec: PromQuery{Name: "A", Query: "sum by (le) (increase(signoz_latency_bucket[5m]))"},
				}}},
			},
		},
		{
			description: "bucket options alongside a promql query are refused",
			request: QueryRangeRequest{
				Start:         1710000000000,
				End:           1710003600000,
				RequestType:   RequestTypeHeatmap,
				BucketOptions: &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{}},
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypePromQL,
					Spec: PromQuery{Name: "A", Query: "sum by (le) (increase(signoz_latency_bucket[5m]))"},
				}}},
			},
			expectedErrContains: "bucketOptions are not supported for promql heatmap requests",
		},
		{
			// a clickhouse query's rows are read by request type like any other,
			// so one shaped as heatmap cells renders without the builder
			description: "a clickhouse query is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeClickHouseSQL,
					Spec: ClickHouseQuery{Name: "A", Query: "SELECT ts, bucket, value FROM cells"},
				}}},
			},
		},
		{
			description: "a formula over disabled builder queries is accepted",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:     "A",
							Signal:   telemetrytypes.SignalMetrics,
							Disabled: true,
							Aggregations: []MetricAggregation{{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:     "B",
							Signal:   telemetrytypes.SignalMetrics,
							Disabled: true,
							Aggregations: []MetricAggregation{{
								MetricName:       "system.memory.limit",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
					{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{Name: "F1", Expression: "A / B"},
					},
				}},
			},
		},
		{
			description: "a formula alongside an enabled query is refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []MetricAggregation{{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
					{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{Name: "F1", Expression: "A * 2"},
					},
				}},
			},
			expectedErrContains: "exactly one enabled query",
		},
		{
			description: "functions on a formula are refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:     "A",
							Signal:   telemetrytypes.SignalMetrics,
							Disabled: true,
							Aggregations: []MetricAggregation{{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
					{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{
							Name:       "F1",
							Expression: "A * 2",
							Functions:  []Function{{Name: FunctionNameAbsolute}},
						},
					},
				}},
			},
			expectedErrContains: "functions are not supported",
		},
		{
			// a disabled query is a formula input, so its functions still reach
			// the cells the heatmap draws
			description: "functions on a disabled formula input are refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:     "A",
							Signal:   telemetrytypes.SignalMetrics,
							Disabled: true,
							Aggregations: []MetricAggregation{{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
							Functions: []Function{{Name: FunctionNameAbsolute}},
						},
					},
					{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{Name: "F1", Expression: "A * 2"},
					},
				}},
			},
			expectedErrContains: "functions are not supported",
		},
		{
			description: "a disabled clickhouse query leaves nothing to draw",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeClickHouseSQL,
					Spec: ClickHouseQuery{Name: "A", Query: "SELECT 1", Disabled: true},
				}}},
			},
			expectedErrContains: "exactly one enabled query",
		},
		{
			description: "two enabled queries are refused",
			request: QueryRangeRequest{
				Start:       1710000000000,
				End:         1710003600000,
				RequestType: RequestTypeHeatmap,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []MetricAggregation{{
								MetricName:       "http.server.request.duration",
								TimeAggregation:  metrictypes.TimeAggregationIncrease,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []MetricAggregation{{
								MetricName:       "http.server.request.body.size",
								TimeAggregation:  metrictypes.TimeAggregationIncrease,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
						},
					},
				}},
			},
			expectedErrContains: "exactly one enabled query",
		},
		{
			description: "fillGaps is refused",
			request: QueryRangeRequest{
				Start:         1710000000000,
				End:           1710003600000,
				RequestType:   RequestTypeHeatmap,
				FormatOptions: &FormatOptions{FillGaps: true},
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
					},
				}}},
			},
			expectedErrContains: "fillGaps is not supported",
		},
		{
			description: "bucketOptions on a time series request is refused",
			request: QueryRangeRequest{
				Start:         1710000000000,
				End:           1710003600000,
				RequestType:   RequestTypeTimeSeries,
				BucketOptions: &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{}},
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []MetricAggregation{{
							MetricName:       "http.server.request.duration",
							TimeAggregation:  metrictypes.TimeAggregationIncrease,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
					},
				}}},
			},
			expectedErrContains: "bucketOptions are only supported for heatmap requests",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			err := testCase.request.Validate()

			if testCase.expectedErrContains == "" {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.Contains(t, err.Error(), testCase.expectedErrContains)
		})
	}
}

func TestHeatmapRequestTypeIsAccepted(t *testing.T) {
	var requestType RequestType
	require.NoError(t, requestType.UnmarshalJSON([]byte(`"heatmap"`)))
	assert.Equal(t, RequestTypeHeatmap, requestType)
	assert.True(t, requestType.IsAggregation())
}

func TestResolveBucketOptions(t *testing.T) {
	coarseScale := 2

	testCases := []struct {
		description       string
		options           *BucketOptions
		expectedBucketing HeatmapBucketing
	}{
		{
			description:       "an absent config defaults to the finest log axis",
			options:           nil,
			expectedBucketing: HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale, NumBuckets: DefaultNumBuckets},
		},
		{
			description:       "a linear spec carries its cap and count through",
			options:           &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 1024, NumBuckets: 20}},
			expectedBucketing: HeatmapBucketing{Kind: BucketsKindLinear, LogScale: MaxLogScale, MaxValue: 1024, NumBuckets: 20},
		},
		{
			description:       "a linear spec without a count takes the default",
			options:           &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 1024}},
			expectedBucketing: HeatmapBucketing{Kind: BucketsKindLinear, LogScale: MaxLogScale, MaxValue: 1024, NumBuckets: DefaultNumBuckets},
		},
		{
			description:       "a coarser scale is carried as the resolution to fold down to",
			options:           &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &coarseScale}},
			expectedBucketing: HeatmapBucketing{Kind: BucketsKindLog, LogScale: coarseScale, NumBuckets: DefaultNumBuckets},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			assert.Equal(t, testCase.expectedBucketing, testCase.options.ToHeatmapBucketing())
		})
	}
}

func TestUnmarshalBucketOptions(t *testing.T) {
	scale := 2

	testCases := []struct {
		description         string
		body                string
		expectedOptions     BucketOptions
		expectedErrContains string
	}{
		{
			description:     "a linear kind decodes its own spec",
			body:            `{"kind":"linear","spec":{"maxValue":500,"numBuckets":25}}`,
			expectedOptions: BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 500, NumBuckets: 25}},
		},
		{
			description:     "a log kind decodes its own spec",
			body:            `{"kind":"log","spec":{"scale":2}}`,
			expectedOptions: BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &scale}},
		},
		{
			description:     "an empty log spec asks for the defaults",
			body:            `{"kind":"log","spec":{}}`,
			expectedOptions: BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{}},
		},
		{
			description:         "a kind with no spec beside it is refused",
			body:                `{"kind":"log"}`,
			expectedErrContains: "bucketOptions spec is required",
		},
		{
			description:         "an unknown kind is refused",
			body:                `{"kind":"quadratic","spec":{}}`,
			expectedErrContains: "invalid bucketOptions kind",
		},
		{
			description:         "a missing kind is refused",
			body:                `{"spec":{"maxValue":500}}`,
			expectedErrContains: "invalid bucketOptions kind",
		},
		{
			// the kind picks the spec, so a field belonging to the other one is a
			// typo rather than something to quietly drop
			description:         "a log field under a linear kind is refused",
			body:                `{"kind":"linear","spec":{"maxValue":500,"scale":2}}`,
			expectedErrContains: "scale",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			var options BucketOptions
			err := json.Unmarshal([]byte(testCase.body), &options)

			if testCase.expectedErrContains != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.expectedErrContains)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedOptions, options)
		})
	}
}

func TestValidateBucketOptions(t *testing.T) {
	tooFine := MaxLogScale + 1
	tooCoarse := MinLogScale - 1
	coarseScale := 2

	testCases := []struct {
		description         string
		options             *BucketOptions
		expectedErrContains string
	}{
		{
			description: "an absent config is accepted",
			options:     nil,
		},
		{
			description: "a full linear spec is accepted",
			options:     &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 1024, NumBuckets: 32}},
		},
		{
			description: "a log spec with a coarser scale is accepted",
			options:     &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &coarseScale}},
		},
		{
			description: "an empty log spec is accepted",
			options:     &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{}},
		},
		{
			description:         "a bucket count above the cap is refused",
			options:             &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 1024, NumBuckets: MaxNumBuckets + 1}},
			expectedErrContains: "numBuckets must be between",
		},
		{
			description:         "a kind with no spec behind it is refused",
			options:             &BucketOptions{Kind: BucketsKind{valuer.NewString("quadratic")}},
			expectedErrContains: "invalid bucketOptions kind",
		},
		{
			description:         "a non-finite maxValue is refused",
			options:             &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: math.NaN()}},
			expectedErrContains: "finite maxValue greater than 0",
		},
		{
			// a linear spec that omits maxValue decodes to zero, which is the
			// same refusal
			description:         "a maxValue at zero is refused",
			options:             &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{}},
			expectedErrContains: "finite maxValue greater than 0",
		},
		{
			description:         "a scale finer than clickhouse buckets at is refused",
			options:             &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &tooFine}},
			expectedErrContains: "scale must be between",
		},
		{
			description:         "a scale below the coarsest axis is refused",
			options:             &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &tooCoarse}},
			expectedErrContains: "scale must be between",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			err := testCase.options.validateBucketOptions()

			if testCase.expectedErrContains == "" {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.Contains(t, err.Error(), testCase.expectedErrContains)
		})
	}
}

func TestResolveHeatmapBucketing(t *testing.T) {
	coarseScale := 1

	testCases := []struct {
		description         string
		aggregation         MetricAggregation
		bucketOptions       *BucketOptions
		expectedBucketing   *HeatmapBucketing
		expectedErrContains string
	}{
		{
			description:       "a histogram buckets on its own le labels",
			aggregation:       MetricAggregation{MetricName: "http.server.request.duration", Type: metrictypes.HistogramType},
			bucketOptions:     nil,
			expectedBucketing: nil,
		},
		{
			description:         "bucketOptions alongside a histogram are refused",
			aggregation:         MetricAggregation{MetricName: "http.server.request.duration", Type: metrictypes.HistogramType},
			bucketOptions:       &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 500}},
			expectedErrContains: "bucketOptions are not supported for histogram metrics",
		},
		{
			description:       "a gauge with no options gets the default log axis",
			aggregation:       MetricAggregation{MetricName: "system.memory.usage", Type: metrictypes.GaugeType},
			bucketOptions:     nil,
			expectedBucketing: &HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale, NumBuckets: DefaultNumBuckets},
		},
		{
			description:       "a sum takes the requested linear axis",
			aggregation:       MetricAggregation{MetricName: "http.server.request.count", Type: metrictypes.SumType},
			bucketOptions:     &BucketOptions{Kind: BucketsKindLinear, Spec: LinearBucketsSpec{MaxValue: 500, NumBuckets: 25}},
			expectedBucketing: &HeatmapBucketing{Kind: BucketsKindLinear, LogScale: MaxLogScale, MaxValue: 500, NumBuckets: 25},
		},
		{
			description:       "a coarser scale is carried as the resolution to fold down to",
			aggregation:       MetricAggregation{MetricName: "system.memory.usage", Type: metrictypes.GaugeType},
			bucketOptions:     &BucketOptions{Kind: BucketsKindLog, Spec: LogBucketsSpec{Scale: &coarseScale}},
			expectedBucketing: &HeatmapBucketing{Kind: BucketsKindLog, LogScale: coarseScale, NumBuckets: DefaultNumBuckets},
		},
		{
			description:         "an unresolved type is refused",
			aggregation:         MetricAggregation{MetricName: "never.seen", Type: metrictypes.UnspecifiedType},
			expectedErrContains: "no type is recorded",
		},
		{
			description:         "an exponential histogram is refused",
			aggregation:         MetricAggregation{MetricName: "http.server.request.duration", Type: metrictypes.ExpHistogramType},
			expectedErrContains: "keeps its bucket counts in a sketch column",
		},
		{
			description:       "a summary buckets like a gauge",
			aggregation:       MetricAggregation{MetricName: "go.gc.duration", Type: metrictypes.SummaryType},
			bucketOptions:     nil,
			expectedBucketing: &HeatmapBucketing{Kind: BucketsKindLog, LogScale: MaxLogScale, NumBuckets: DefaultNumBuckets},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			err := testCase.aggregation.VerifyAndApplyBucketOptions(testCase.bucketOptions)

			if testCase.expectedErrContains != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.expectedErrContains)
				assert.Contains(t, err.Error(), testCase.aggregation.MetricName)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedBucketing, testCase.aggregation.HeatmapBucketing)
		})
	}
}
