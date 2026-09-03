package querier

import (
	"math"
	"reflect"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeColumnType is the minimum of driver.ColumnType that readAsHeatmap reads:
// the scan type it allocates a slot from.
type fakeColumnType struct {
	name     string
	scanType reflect.Type
}

func (c fakeColumnType) Name() string             { return c.name }
func (c fakeColumnType) Nullable() bool           { return false }
func (c fakeColumnType) ScanType() reflect.Type   { return c.scanType }
func (c fakeColumnType) DatabaseTypeName() string { return c.scanType.String() }

// fakeRows replays a fixed set of rows, each holding one value per column in
// the order the columns are declared.
type fakeRows struct {
	columns []fakeColumnType
	rows    [][]any
	cursor  int
}

func (r *fakeRows) Next() bool {
	r.cursor++
	return r.cursor <= len(r.rows)
}

func (r *fakeRows) Scan(dest ...any) error {
	row := r.rows[r.cursor-1]
	for i, value := range row {
		reflect.ValueOf(dest[i]).Elem().Set(reflect.ValueOf(value))
	}
	return nil
}

func (r *fakeRows) ScanStruct(any) error { return nil }

func (r *fakeRows) ColumnTypes() []driver.ColumnType {
	types := make([]driver.ColumnType, len(r.columns))
	for i, column := range r.columns {
		types[i] = column
	}
	return types
}

func (r *fakeRows) Totals(...any) error { return nil }

func (r *fakeRows) Columns() []string {
	names := make([]string, len(r.columns))
	for i, column := range r.columns {
		names[i] = column.name
	}
	return names
}

func (r *fakeRows) HasData() bool { return len(r.rows) > 0 }
func (r *fakeRows) Close() error  { return nil }
func (r *fakeRows) Err() error    { return nil }

var _ driver.Rows = (*fakeRows)(nil)

func TestReadAsHeatmapBuildsSharedBucketAxis(t *testing.T) {
	first := time.UnixMilli(1710000000000)
	second := time.UnixMilli(1710000060000)

	rows := &fakeRows{
		columns: []fakeColumnType{
			{name: "ts", scanType: reflect.TypeOf(time.Time{})},
			{name: "__GROUP_BY_KEY_0_service.name", scanType: reflect.TypeOf("")},
			{name: "__bucket", scanType: reflect.TypeOf(float64(0))},
			{name: "__result_0", scanType: reflect.TypeOf(float64(0))},
		},
		rows: [][]any{
			{first, "cart", 5.0, 3.0},
			{first, "cart", 10.0, 7.0},
			{first, "cart", math.Inf(1), 1.0},
			{first, "pay", 10.0, 2.0},
			{second, "cart", 5.0, 4.0},
			{second, "pay", math.Inf(1), 6.0},
		},
	}

	data, err := readAsHeatmap(rows, &qbtypes.TimeRange{From: 1710000000000, To: 1710000120000}, qbtypes.Step{Duration: time.Minute}, "A")
	require.NoError(t, err)
	require.Len(t, data.Aggregations, 1)

	aggregation := data.Aggregations[0]
	// +Inf is not a boundary; it is the slot past the last one
	assert.Equal(t, []float64{5, 10}, aggregation.Meta.Buckets)
	require.Len(t, aggregation.Series, 2)

	cart := aggregation.Series[0]
	require.Len(t, cart.Labels, 1)
	assert.Equal(t, "cart", cart.Labels[0].Value)
	require.Len(t, cart.Values, 2)
	assert.Equal(t, int64(1710000000000), cart.Values[0].Timestamp)
	assert.Equal(t, []float64{3, 7, 1}, cart.Values[0].Values)
	assert.Equal(t, []float64{4, 0, 0}, cart.Values[1].Values)

	pay := aggregation.Series[1]
	assert.Equal(t, "pay", pay.Labels[0].Value)
	assert.Equal(t, []float64{0, 2, 0}, pay.Values[0].Values)
	assert.Equal(t, []float64{0, 0, 6}, pay.Values[1].Values)
}

func TestReadAsHeatmapWithoutGroupBy(t *testing.T) {
	at := time.UnixMilli(1710000000000)

	rows := &fakeRows{
		columns: []fakeColumnType{
			{name: "ts", scanType: reflect.TypeOf(time.Time{})},
			{name: "__bucket", scanType: reflect.TypeOf(float64(0))},
			{name: "__result_0", scanType: reflect.TypeOf(float64(0))},
		},
		rows: [][]any{
			{at, 2.5, 9.0},
			{at, 5.0, 4.0},
		},
	}

	data, err := readAsHeatmap(rows, nil, qbtypes.Step{Duration: time.Minute}, "A")
	require.NoError(t, err)
	require.Len(t, data.Aggregations, 1)

	aggregation := data.Aggregations[0]
	assert.Equal(t, []float64{2.5, 5}, aggregation.Meta.Buckets)
	require.Len(t, aggregation.Series, 1)
	assert.Empty(t, aggregation.Series[0].Labels)
	// no +Inf row, so the overflow slot is present but empty
	assert.Equal(t, []float64{9, 4, 0}, aggregation.Series[0].Values[0].Values)
}

func TestReadAsHeatmapWithoutRows(t *testing.T) {
	rows := &fakeRows{
		columns: []fakeColumnType{
			{name: "ts", scanType: reflect.TypeOf(time.Time{})},
			{name: "__bucket", scanType: reflect.TypeOf(float64(0))},
			{name: "__result_0", scanType: reflect.TypeOf(float64(0))},
		},
	}

	data, err := readAsHeatmap(rows, nil, qbtypes.Step{Duration: time.Minute}, "A")
	require.NoError(t, err)
	assert.Equal(t, "A", data.QueryName)
	assert.Empty(t, data.Aggregations)
}

func TestReadAsHeatmapMarksPartialTimestamps(t *testing.T) {
	misaligned := time.UnixMilli(1710000000000)
	aligned := time.UnixMilli(1710000060000)

	rows := &fakeRows{
		columns: []fakeColumnType{
			{name: "ts", scanType: reflect.TypeOf(time.Time{})},
			{name: "__bucket", scanType: reflect.TypeOf(float64(0))},
			{name: "__result_0", scanType: reflect.TypeOf(float64(0))},
		},
		rows: [][]any{
			{misaligned, 5.0, 1.0},
			{aligned, 5.0, 2.0},
		},
	}

	// The window starts mid-step, so the step the first row falls in is only
	// partly covered by it.
	data, err := readAsHeatmap(rows, &qbtypes.TimeRange{From: 1710000030000, To: 1710000120000}, qbtypes.Step{Duration: time.Minute}, "A")
	require.NoError(t, err)

	values := data.Aggregations[0].Series[0].Values
	require.Len(t, values, 2)
	assert.True(t, values[0].Partial)
	assert.False(t, values[1].Partial)
}

func TestMergeTimeSeriesResultsUnionsHeatmapAxes(t *testing.T) {
	// a log axis holds whichever bands the data reached, so a wide cached range
	// and a narrow fresh one routinely disagree on which bands exist
	cached := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{{
			Index: 0,
			Meta:  qbtypes.AggregationMeta{Buckets: []float64{1, 4, 16}},
			Series: []*qbtypes.TimeSeries{{
				Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "node-1"}},
				Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 2, 3, 4}}},
			}},
		}},
	}
	fresh := []*qbtypes.Result{{
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{{
				Index: 0,
				Meta:  qbtypes.AggregationMeta{Buckets: []float64{2, 4}},
				Series: []*qbtypes.TimeSeries{{
					Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "node-1"}},
					Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000060000, Values: []float64{5, 6, 7}}},
				}},
			}},
		},
	}}

	merged := (&querier{}).mergeTimeSeriesResults(cached, fresh)

	require.Len(t, merged.Aggregations, 1)
	aggBucket := merged.Aggregations[0]
	assert.Equal(t, []float64{1, 2, 4, 16}, aggBucket.Meta.Buckets)

	require.Len(t, aggBucket.Series, 1)
	require.Len(t, aggBucket.Series[0].Values, 2)
	// the cached 16 band survives even though the fresh range never reached it
	assert.Equal(t, []float64{1, 0, 2, 3, 4}, aggBucket.Series[0].Values[0].Values)
	// and the fresh 2 band survives even though the cached range never had it
	assert.Equal(t, []float64{0, 5, 6, 0, 7}, aggBucket.Series[0].Values[1].Values)
}

func TestReadAsHeatmapAcceptsHandWrittenColumnAliases(t *testing.T) {
	at := time.UnixMilli(1710000000000)

	// the aliases a user written clickhouse query would reach for, rather than
	// the __bucket / __result_0 the statement builder emits
	rows := &fakeRows{
		columns: []fakeColumnType{
			{name: "ts", scanType: reflect.TypeOf(time.Time{})},
			{name: "service.name", scanType: reflect.TypeOf("")},
			{name: "bucket", scanType: reflect.TypeOf(float64(0))},
			{name: "value", scanType: reflect.TypeOf(float64(0))},
		},
		rows: [][]any{
			{at, "cart", 5.0, 3.0},
			{at, "cart", 10.0, 7.0},
		},
	}

	data, err := readAsHeatmap(rows, nil, qbtypes.Step{Duration: time.Minute}, "A")
	require.NoError(t, err)
	require.Len(t, data.Aggregations, 1)

	aggregation := data.Aggregations[0]
	assert.Equal(t, []float64{5, 10}, aggregation.Meta.Buckets)
	require.Len(t, aggregation.Series, 1)
	require.Len(t, aggregation.Series[0].Labels, 1)
	assert.Equal(t, "cart", aggregation.Series[0].Labels[0].Value)
	assert.Equal(t, []float64{3, 7, 0}, aggregation.Series[0].Values[0].Values)
}

func TestApplyFormulasBucketsTheFormulaOutput(t *testing.T) {
	q := &querier{logger: instrumentationtest.New().Logger()}

	seriesAt := func(labelValue string, values ...float64) *qbtypes.TimeSeries {
		points := make([]*qbtypes.TimeSeriesValue, 0, len(values))
		for index, value := range values {
			points = append(points, &qbtypes.TimeSeriesValue{
				Timestamp: 1710000000000 + int64(index)*60000,
				Value:     value,
			})
		}
		return &qbtypes.TimeSeries{
			Labels: []*qbtypes.Label{{
				Key:   telemetrytypes.TelemetryFieldKey{Name: "host.name"},
				Value: labelValue,
			}},
			Values: points,
		}
	}

	results := map[string]*qbtypes.Result{
		"A": {Value: &qbtypes.TimeSeriesData{
			QueryName:    "A",
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Series: []*qbtypes.TimeSeries{seriesAt("h1", 8, 64)}}},
		}},
		"B": {Value: &qbtypes.TimeSeriesData{
			QueryName:    "B",
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Series: []*qbtypes.TimeSeries{seriesAt("h1", 4, 16)}}},
		}},
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType:   qbtypes.RequestTypeHeatmap,
		BucketOptions: &qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLog, Spec: qbtypes.LogBucketsSpec{}},
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{
			{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "A", Disabled: true}},
			{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "B", Disabled: true}},
			{Type: qbtypes.QueryTypeFormula, Spec: qbtypes.QueryBuilderFormula{Name: "F1", Expression: "A / B"}},
		}},
	}

	results = q.applyFormulas(t.Context(), results, req)

	formula, ok := results["F1"]
	require.True(t, ok, "formula produced no result")
	tsData, ok := formula.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)

	// 8/4 is 2 and 64/16 is 4, a doubling apart, so the filled axis carries
	// every band from 2 to 4 inclusive and the two points sit at its ends
	aggBucket := tsData.Aggregations[0]
	require.Len(t, aggBucket.Meta.Buckets, 17)
	assert.Equal(t, math.Exp2(1), aggBucket.Meta.Buckets[0])
	assert.Equal(t, math.Exp2(2), aggBucket.Meta.Buckets[16])

	require.Len(t, aggBucket.Series, 1)
	points := aggBucket.Series[0].Values
	require.Len(t, points, 2)
	assert.Equal(t, float64(1), points[0].Values[0])
	assert.Equal(t, float64(1), points[1].Values[16])
	for index, point := range points {
		require.Len(t, point.Values, 18, "point %d", index)
		var total float64
		for _, count := range point.Values {
			total += count
		}
		assert.Equal(t, float64(1), total, "point %d counts the one series it came from", index)
	}
}

func TestApplyFormulasCoarsensTheFormulaAxis(t *testing.T) {
	q := &querier{logger: instrumentationtest.New().Logger()}

	scale := 0
	req := &qbtypes.QueryRangeRequest{
		RequestType:   qbtypes.RequestTypeHeatmap,
		BucketOptions: &qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLog, Spec: qbtypes.LogBucketsSpec{Scale: &scale}},
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{
			{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "A", Disabled: true}},
			{Type: qbtypes.QueryTypeFormula, Spec: qbtypes.QueryBuilderFormula{Name: "F1", Expression: "A * 2"}},
		}},
	}

	results := map[string]*qbtypes.Result{
		"A": {Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Series: []*qbtypes.TimeSeries{{
				Values: []*qbtypes.TimeSeriesValue{
					{Timestamp: 1710000000000, Value: 1.5},
					{Timestamp: 1710000060000, Value: 2},
				},
			}}}},
		}},
	}

	results = q.applyFormulas(t.Context(), results, req)

	tsData := results["F1"].Value.(*qbtypes.TimeSeriesData)
	aggBucket := tsData.Aggregations[0]
	// 3 and 4 sit in different bands at scale 4 but the same doubling at scale 0
	assert.Equal(t, []float64{math.Exp2(2)}, aggBucket.Meta.Buckets)
	assert.Equal(t, []float64{1, 0}, aggBucket.Series[0].Values[0].Values)
	assert.Equal(t, []float64{1, 0}, aggBucket.Series[0].Values[1].Values)
}

func TestTrimResultToFluxBoundaryKeepsTheHeatmapAxis(t *testing.T) {
	cache := &bucketCache{logger: instrumentationtest.New().Logger()}

	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeHeatmap,
		Value: &qbtypes.TimeSeriesData{
			Aggregations: []*qbtypes.AggregationBucket{{
				Index: 0,
				Alias: "__result_0",
				Meta:  qbtypes.AggregationMeta{Unit: "By", Buckets: []float64{1, 2, 4}},
				Series: []*qbtypes.TimeSeries{{
					Values: []*qbtypes.TimeSeriesValue{
						{Timestamp: 1710000000000, Values: []float64{1, 2, 3, 4}},
					},
				}},
			}},
		},
	}

	trimmed := cache.trimResultToFluxBoundary(result, 1710000060000)

	tsData, ok := trimmed.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)

	// the counts are positional against the axis, so a cached bucket that lost
	// Meta.Buckets would be realigned from an empty axis and collapse into the
	// overflow slot on the way back out
	aggBucket := tsData.Aggregations[0]
	assert.Equal(t, []float64{1, 2, 4}, aggBucket.Meta.Buckets)
	assert.Equal(t, "By", aggBucket.Meta.Unit)
	assert.Equal(t, "__result_0", aggBucket.Alias)
}

func TestRealignFromAnEmptyAxisCollapsesIntoTheOverflow(t *testing.T) {
	// pins the behaviour the trim bug exposed: with no axis to read the counts
	// against, everything lands in the overflow slot
	series := []*qbtypes.TimeSeries{{
		Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{7, 8, 9, 10}}},
	}}

	qbtypes.RealignHeatmapValues(series, nil, []float64{1, 2, 4})

	assert.Equal(t, []float64{0, 0, 0, 7}, series[0].Values[0].Values)
}
