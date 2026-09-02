package querier

import (
	"reflect"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
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

func TestMergeSpanAttributeColumns_JSONColumn(t *testing.T) {
	t.Run("json only flattens nested paths and preserves types", func(t *testing.T) {
		data := map[string]any{
			"attributes": telemetrystoretypes.JSONValue{
				"http": map[string]any{
					"route": "/api/pay",
					"retry": map[string]any{"count": float64(3)},
				},
				"cache.hit": true,
			},
			"resources_string": map[string]string{"service.name": "api"},
		}

		mergeSpanAttributeColumns(data)

		attrs, ok := data["attributes"].(map[string]any)
		require.True(t, ok, "attributes should be flattened to map[string]any, got %T", data["attributes"])
		assert.Equal(t, "/api/pay", attrs["http.route"])
		assert.Equal(t, float64(3), attrs["http.retry.count"])
		assert.Equal(t, true, attrs["cache.hit"])
		_, nested := attrs["http"]
		assert.False(t, nested, "nested objects must be flattened away, not kept")
	})

	t.Run("straddle: json paths win over legacy map on collision, union otherwise", func(t *testing.T) {
		data := map[string]any{
			"attributes_string": map[string]string{"http.route": "/old", "only.map": "m"},
			"attributes_number": map[string]float64{"http.status": 500},
			"attributes":        telemetrystoretypes.JSONValue{"http": map[string]any{"route": "/new"}},
			"resources_string":  map[string]string{"service.name": "api"},
		}

		mergeSpanAttributeColumns(data)

		attrs := data["attributes"].(map[string]any)
		assert.Equal(t, "/new", attrs["http.route"], "json home wins on collision")
		assert.Equal(t, "m", attrs["only.map"], "map-only key survives")
		assert.Equal(t, float64(500), attrs["http.status"], "number map key survives")
		for _, removed := range []string{"attributes_string", "attributes_number", "attributes_bool"} {
			_, present := data[removed]
			assert.False(t, present, "%s should be removed", removed)
		}
	})
}
