package querier

import (
	"reflect"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMergeSpanAttributeColumns_ParsesEventsAndLinks(t *testing.T) {
	data := map[string]any{
		"attributes_string": map[string]string{"http.method": "GET"},
		"attributes_number": map[string]float64{"http.status_code": 200},
		"attributes_bool":   map[string]bool{"is_root": true},
		"resources_string":  map[string]string{"service.name": "api"},
		"events": []string{
			`{"name":"request_received","timeUnixNano":1778489782759245000,"attributeMap":{"http.method":"GET","http.route":"/api/chat"}}`,
			`{"name":"cache_lookup","timeUnixNano":1778489782811697000,"attributeMap":{"cache.hit":"true","cache.key":"user:123:prompt"}}`,
		},
		"links": `[{"traceId":"abc","spanId":"123","refType":"CHILD_OF"},{"traceId":"def","spanId":"456","refType":"FOLLOWS_FROM"}]`,
	}

	mergeSpanAttributeColumns(data)

	attrs, ok := data["attributes"].(map[string]any)
	if !ok {
		t.Fatalf("expected attributes to be map[string]any, got %T", data["attributes"])
	}
	if attrs["http.method"] != "GET" || attrs["http.status_code"] != float64(200) || attrs["is_root"] != true {
		t.Fatalf("attributes not merged correctly: %#v", attrs)
	}

	res, ok := data["resource"].(map[string]string)
	if !ok || res["service.name"] != "api" {
		t.Fatalf("resource not set correctly: %#v", data["resource"])
	}

	for _, removed := range []string{"attributes_string", "attributes_number", "attributes_bool", "resources_string"} {
		if _, present := data[removed]; present {
			t.Fatalf("expected %s to be removed", removed)
		}
	}

	events, ok := data["events"].([]spantypes.EventV2)
	if !ok {
		t.Fatalf("expected events to be []spantypes.EventV2, got %T", data["events"])
	}
	wantEvents := []spantypes.EventV2{
		{
			Name:         "request_received",
			TimeUnixNano: 1778489782759245000,
			Attributes:   map[string]any{"http.method": "GET", "http.route": "/api/chat"},
			IsError:      false,
		},
		{
			Name:         "cache_lookup",
			TimeUnixNano: 1778489782811697000,
			Attributes:   map[string]any{"cache.hit": "true", "cache.key": "user:123:prompt"},
		},
	}
	if !reflect.DeepEqual(events, wantEvents) {
		t.Fatalf("events parsed incorrectly:\n got:  %#v\nwant: %#v", events, wantEvents)
	}

	links, ok := data["links"].([]spantypes.Link)
	if !ok {
		t.Fatalf("expected links to be []spantypes.Link, got %T", data["links"])
	}
	wantLinks := []spantypes.Link{
		{TraceID: "abc", SpanID: "123"},
		{TraceID: "def", SpanID: "456"},
	}
	if !reflect.DeepEqual(links, wantLinks) {
		t.Fatalf("links parsed incorrectly:\n got:  %#v\nwant: %#v", links, wantLinks)
	}
}

// A ClickHouse query can put a JSON column in the result of any request type — e.g.
// `select * from signoz_logs.logs_v2` on a body_v2 stack, where `*` covers body_v2.
func TestConsume_JSONColumn(t *testing.T) {
	ts := time.Date(2026, 8, 14, 10, 0, 0, 0, time.UTC)
	body := `{"level":"error","attrs":{"code":500}}`
	wantBody := telemetrystoretypes.JSONValue{
		"level": "error",
		"attrs": map[string]any{"code": float64(500)},
	}

	// the scalar reader reuses its scan slots across rows, so each row must still carry its own body
	t.Run("scalar", func(t *testing.T) {
		rows := telemetrystore.WrapRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "body_v2", Type: "JSON"},
			{Name: "__result_0", Type: "UInt64"},
		}, [][]any{{body, uint64(3)}, {`{"level":"warn"}`, uint64(1)}}))

		payload, err := consume(rows, qbtypes.RequestTypeScalar, nil, qbtypes.Step{}, "A")
		require.NoError(t, err)

		data := payload.(*qbtypes.ScalarData)
		require.Len(t, data.Data, 2)
		assert.Equal(t, wantBody, data.Data[0][0])
		assert.Equal(t, uint64(3), data.Data[0][1])
		assert.Equal(t, telemetrystoretypes.JSONValue{"level": "warn"}, data.Data[1][0])
		assert.Equal(t, uint64(1), data.Data[1][1])
	})

	t.Run("time series", func(t *testing.T) {
		rows := telemetrystore.WrapRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "body_v2", Type: "JSON"},
			{Name: "__result_0", Type: "UInt64"},
		}, [][]any{{ts, body, uint64(3)}}))

		payload, err := consume(rows, qbtypes.RequestTypeTimeSeries, nil, qbtypes.Step{}, "A")
		require.NoError(t, err)

		data := payload.(*qbtypes.TimeSeriesData)
		require.Len(t, data.Aggregations, 1)
		require.Len(t, data.Aggregations[0].Series, 1)
		require.Len(t, data.Aggregations[0].Series[0].Values, 1)
		assert.Equal(t, float64(3), data.Aggregations[0].Series[0].Values[0].Value)
	})

	// grouping by a JSON column is legal in ClickHouse, so each document has to label its own
	// series rather than being dropped, which would merge every group into one
	t.Run("time series grouped by the JSON column", func(t *testing.T) {
		rows := telemetrystore.WrapRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "body_v2", Type: "JSON"},
			{Name: "__result_0", Type: "UInt64"},
		}, [][]any{
			{ts, `{"level":"error"}`, uint64(7)},
			{ts, `{"level":"warn"}`, uint64(2)},
		}))

		payload, err := consume(rows, qbtypes.RequestTypeTimeSeries, nil, qbtypes.Step{}, "A")
		require.NoError(t, err)

		data := payload.(*qbtypes.TimeSeriesData)
		require.Len(t, data.Aggregations, 1)
		require.Len(t, data.Aggregations[0].Series, 2)

		got := map[string]float64{}
		for _, series := range data.Aggregations[0].Series {
			require.Len(t, series.Labels, 1)
			require.Len(t, series.Values, 1)
			got[series.Labels[0].Value.(string)] = series.Values[0].Value
		}
		assert.Equal(t, map[string]float64{`{"level":"error"}`: 7, `{"level":"warn"}`: 2}, got)
	})

	t.Run("raw", func(t *testing.T) {
		rows := telemetrystore.WrapRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "timestamp", Type: "DateTime"},
			{Name: "body_v2", Type: "JSON"},
		}, [][]any{{ts, body}}))

		payload, err := consume(rows, qbtypes.RequestTypeRaw, nil, qbtypes.Step{}, "A")
		require.NoError(t, err)

		data := payload.(*qbtypes.RawData)
		require.Len(t, data.Rows, 1)
		assert.Equal(t, ts, data.Rows[0].Timestamp.UTC())
		assert.Equal(t, wantBody, data.Rows[0].Data["body_v2"])
	})
}

// A JSON path (e.g. `body_v2.level`) comes back as a Dynamic column, which the driver scans
// into a chcol.Variant envelope rather than the value itself.
func TestUnwrapVariant(t *testing.T) {
	assert.Equal(t, "error", unwrapVariant(chcol.NewDynamicWithType("error", "String")))
	assert.Nil(t, unwrapVariant(chcol.Dynamic{}))
	assert.Equal(t, uint64(3), unwrapVariant(uint64(3)))
}

func TestMergeSpanAttributeColumns_EmptyEventsAndLinks(t *testing.T) {
	data := map[string]any{
		"events": []string{},
		"links":  "[]",
	}

	mergeSpanAttributeColumns(data)

	if events, ok := data["events"].([]spantypes.EventV2); !ok || len(events) != 0 {
		t.Fatalf("expected empty []spantypes.EventV2, got %#v", data["events"])
	}
	if links, ok := data["links"].([]spantypes.Link); !ok || len(links) != 0 {
		t.Fatalf("expected empty []spantypes.Link, got %#v", data["links"])
	}
}

// boolRows reports a bool scan type for one column, which cmock cannot do on its own.
type boolRows struct {
	driver.Rows
	col string
}

func (r boolRows) ColumnTypes() []driver.ColumnType {
	out := r.Rows.ColumnTypes()
	for i, colType := range out {
		if colType.Name() == r.col {
			out[i] = cmock.NewColumnType(colType.Name(), "Bool", false, reflect.TypeOf(true))
		}
	}
	return out
}

// A time-series result can carry numeric widths narrower than 32 bits — max(severity_number) is
// UInt8, kind is Int8, has_error is Bool. Dropping them empties the chart when the column holds the
// aggregation, and merges every group into one series when it is a group-by key.
func TestConsume_NarrowNumericWidths(t *testing.T) {
	ts := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)

	seriesOf := func(t *testing.T, rows driver.Rows) []*qbtypes.TimeSeries {
		t.Helper()
		payload, err := consume(rows, qbtypes.RequestTypeTimeSeries, nil, qbtypes.Step{}, "A")
		require.NoError(t, err)
		data := payload.(*qbtypes.TimeSeriesData)
		require.Len(t, data.Aggregations, 1)
		return data.Aggregations[0].Series
	}

	t.Run("UInt8 aggregation", func(t *testing.T) {
		series := seriesOf(t, cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "__result_0", Type: "UInt8"},
		}, [][]any{{ts, uint8(17)}}))

		require.Len(t, series, 1)
		require.Len(t, series[0].Values, 1)
		assert.Equal(t, float64(17), series[0].Values[0].Value)
	})

	t.Run("Int8 group-by", func(t *testing.T) {
		series := seriesOf(t, cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "kind", Type: "Int8"},
			{Name: "__result_0", Type: "UInt64"},
		}, [][]any{{ts, int8(2), uint64(7)}, {ts, int8(3), uint64(2)}}))

		got := map[float64]float64{}
		for _, s := range series {
			require.Len(t, s.Labels, 1)
			require.Len(t, s.Values, 1)
			got[s.Labels[0].Value.(float64)] = s.Values[0].Value
		}
		assert.Equal(t, map[float64]float64{2: 7, 3: 2}, got)
	})

	t.Run("Bool aggregation", func(t *testing.T) {
		series := seriesOf(t, boolRows{col: "__result_0", Rows: cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "__result_0", Type: "UInt8"},
		}, [][]any{{ts, uint8(1)}})})

		require.Len(t, series, 1)
		require.Len(t, series[0].Values, 1)
		assert.Equal(t, float64(1), series[0].Values[0].Value)
	})

	t.Run("Bool group-by", func(t *testing.T) {
		series := seriesOf(t, boolRows{col: "has_error", Rows: cmock.NewRows([]cmock.ColumnType{
			{Name: "ts", Type: "DateTime"},
			{Name: "has_error", Type: "UInt8"},
			{Name: "__result_0", Type: "UInt64"},
		}, [][]any{{ts, uint8(1), uint64(7)}, {ts, uint8(0), uint64(2)}})})

		got := map[bool]float64{}
		for _, s := range series {
			require.Len(t, s.Labels, 1)
			require.Len(t, s.Values, 1)
			got[s.Labels[0].Value.(bool)] = s.Values[0].Value
		}
		assert.Equal(t, map[bool]float64{true: 7, false: 2}, got)
	})
}

// A raw ClickHouse query picks its own aliases, so __result_<n> can carry any index — including
// one that overflows int or would size a slice in the terabytes.
func TestConsume_HugeAggregationAlias(t *testing.T) {
	ts := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)

	for _, alias := range []string{"__result_99999999999999999999", "__result_4000000000"} {
		t.Run(alias, func(t *testing.T) {
			rows := cmock.NewRows([]cmock.ColumnType{
				{Name: "ts", Type: "DateTime"},
				{Name: alias, Type: "UInt64"},
			}, [][]any{{ts, uint64(7)}})

			payload, err := consume(rows, qbtypes.RequestTypeTimeSeries, nil, qbtypes.Step{}, "A")
			require.NoError(t, err)

			// the alias is not honored as an aggregation; the single numeric column carries the value
			data := payload.(*qbtypes.TimeSeriesData)
			require.Len(t, data.Aggregations, 1)
			require.Len(t, data.Aggregations[0].Series, 1)
			require.Len(t, data.Aggregations[0].Series[0].Values, 1)
			assert.Equal(t, float64(7), data.Aggregations[0].Series[0].Values[0].Value)
		})
	}
}
