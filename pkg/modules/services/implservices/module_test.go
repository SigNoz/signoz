package implservices

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestBuildQueryRangeRequest(t *testing.T) {
	m := &module{}

	tests := []struct {
		name     string
		req      servicetypesv1.Request
		wantErr  string
		assertOK func(t *testing.T, qr qbtypes.QueryRangeRequest, startMs, endMs uint64)
	}{
		{
			name: "valid with tags builds scope+filter and query",
			req: servicetypesv1.Request{
				Start: "1000000000", // 1s in ns -> 1000 ms
				End:   "2000000000", // 2s in ns -> 2000 ms
				Tags: []servicetypesv1.TagFilterItem{
					{Key: "service.name", Operator: "in", StringValues: []string{"frontend", "backend"}},
					{Key: "env", Operator: "=", StringValues: []string{"prod"}},
				},
			},
			assertOK: func(t *testing.T, qr qbtypes.QueryRangeRequest, startMs, endMs uint64) {
				assert.Equal(t, uint64(1000), startMs)
				assert.Equal(t, uint64(2000), endMs)
				assert.Equal(t, qbtypes.RequestTypeScalar, qr.RequestType)
				assert.Equal(t, 1, len(qr.CompositeQuery.Queries))

				qe := qr.CompositeQuery.Queries[0]
				assert.Equal(t, qbtypes.QueryTypeBuilder, qe.Type)

				// Spec should be a traces builder query
				spec, ok := qe.Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation])
				if !ok {
					t.Fatalf("unexpected spec type: %T", qe.Spec)
				}
				assert.Equal(t, telemetrytypes.SignalTraces, spec.Signal)

				// Filter should include both user filter and the scope expression
				assert.NotNil(t, spec.Filter)
				expr := spec.Filter.Expression
				assert.Contains(t, expr, "service.name IN ['frontend','backend']")
				assert.Contains(t, expr, "env = 'prod'")
				assert.Contains(t, expr, "isRoot = 'true' OR isEntryPoint = 'true'")

				// GroupBy should include service.name
				if assert.Equal(t, 1, len(spec.GroupBy)) {
					assert.Equal(t, "service.name", spec.GroupBy[0].TelemetryFieldKey.Name)
				}

				// Aggregations should match expected expressions and aliases
				if assert.Equal(t, 5, len(spec.Aggregations)) {
					assert.Equal(t, "p99(duration_nano)", spec.Aggregations[0].Expression)
					assert.Equal(t, "p99", spec.Aggregations[0].Alias)
					assert.Equal(t, "avg(duration_nano)", spec.Aggregations[1].Expression)
					assert.Equal(t, "avgDuration", spec.Aggregations[1].Alias)
					assert.Equal(t, "count()", spec.Aggregations[2].Expression)
					assert.Equal(t, "numCalls", spec.Aggregations[2].Alias)
					assert.Equal(t, "countIf(status_code = 2)", spec.Aggregations[3].Expression)
					assert.Equal(t, "numErrors", spec.Aggregations[3].Alias)
					assert.Equal(t, "countIf(response_status_code >= 400 AND response_status_code < 500)", spec.Aggregations[4].Expression)
					assert.Equal(t, "num4XX", spec.Aggregations[4].Alias)
				}
			},
		},
		{
			name: "valid without tags uses only scope filter",
			req: servicetypesv1.Request{
				Start: "3000000000", // 3s ns -> 3000 ms
				End:   "5000000000", // 5s ns -> 5000 ms
			},
			assertOK: func(t *testing.T, qr qbtypes.QueryRangeRequest, startMs, endMs uint64) {
				assert.Equal(t, uint64(3000), startMs)
				assert.Equal(t, uint64(5000), endMs)
				qe := qr.CompositeQuery.Queries[0]
				spec := qe.Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation])
				if assert.NotNil(t, spec.Filter) {
					assert.Equal(t, "isRoot = 'true' OR isEntryPoint = 'true'", spec.Filter.Expression)
				}
			},
		},
		{
			name:    "invalid start",
			req:     servicetypesv1.Request{Start: "abc", End: "100"},
			wantErr: "invalid start time",
		},
		{
			name:    "invalid end",
			req:     servicetypesv1.Request{Start: "100", End: "abc"},
			wantErr: "invalid end time",
		},
		{
			name:    "start not before end",
			req:     servicetypesv1.Request{Start: "2000", End: "2000"},
			wantErr: "start must be before end",
		},
		{
			name:    "start greater than end",
			req:     servicetypesv1.Request{Start: "2001", End: "2000"},
			wantErr: "start must be before end",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qr, startMs, endMs, err := m.buildQueryRangeRequest(&tt.req)
			if tt.wantErr != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				return
			}
			assert.NoError(t, err)
			if tt.assertOK != nil {
				tt.assertOK(t, qr, startMs, endMs)
			}
		})
	}
}

func TestMapQueryRangeRespToServices(t *testing.T) {
	m := &module{}

	groupCol := &qbtypes.ColumnDescriptor{
		TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"},
		Type:              qbtypes.ColumnTypeGroup,
	}
	agg := func(idx int64) *qbtypes.ColumnDescriptor {
		return &qbtypes.ColumnDescriptor{AggregationIndex: idx, Type: qbtypes.ColumnTypeAggregation}
	}

	tests := []struct {
		name           string
		resp           *qbtypes.QueryRangeResponse
		startMs, endMs uint64
		wantItems      []*servicetypesv1.ResponseItem
		wantServices   []string
	}{
		{
			name: "empty response -> no items",
			resp: &qbtypes.QueryRangeResponse{
				Type: qbtypes.RequestTypeScalar,
				Data: qbtypes.QueryData{Results: []any{}},
			},
			startMs: 1000, endMs: 2000,
			wantItems:    []*servicetypesv1.ResponseItem{},
			wantServices: []string{},
		},
		{
			name: "no ScalarData -> no items",
			resp: &qbtypes.QueryRangeResponse{
				Type: qbtypes.RequestTypeScalar,
				Data: qbtypes.QueryData{Results: []any{"not-scalar"}},
			},
			startMs: 1000, endMs: 2000,
			wantItems:    []*servicetypesv1.ResponseItem{},
			wantServices: []string{},
		},
		{
			name: "missing service.name column -> no items",
			resp: &qbtypes.QueryRangeResponse{
				Type: qbtypes.RequestTypeScalar,
				Data: qbtypes.QueryData{
					Results: []any{&qbtypes.ScalarData{
						QueryName: "A",
						Columns:   []*qbtypes.ColumnDescriptor{agg(0)}, Data: [][]any{},
					},
					},
				},
			},
			startMs: 1000, endMs: 2000,
			wantItems:    []*servicetypesv1.ResponseItem{},
			wantServices: []string{},
		},
		{
			name: "single row maps fields and rates",
			resp: &qbtypes.QueryRangeResponse{
				Type: qbtypes.RequestTypeScalar,
				Data: qbtypes.QueryData{
					Results: []any{
						&qbtypes.ScalarData{
							QueryName: "A",
							Columns:   []*qbtypes.ColumnDescriptor{groupCol, agg(0), agg(1), agg(2), agg(3), agg(4)},
							Data:      [][]any{{"svc-a", float64(123.0), float64(45.0), uint64(10), uint64(2), uint64(1)}},
						},
					},
				},
			},
			startMs: 0, endMs: 10000, // 10s window -> callRate = 10/10=1, errorRate=20%, fourXXRate=10%
			wantItems: []*servicetypesv1.ResponseItem{
				{
					ServiceName:  "svc-a",
					Percentile99: 123.0,
					AvgDuration:  45.0,
					NumCalls:     10,
					CallRate:     1.0,
					NumErrors:    2,
					ErrorRate:    20.0, // in percentage
					Num4XX:       1,
					FourXXRate:   10.0, // in percentage
					DataWarning:  servicetypesv1.DataWarning{TopLevelOps: []string{}},
				},
			},
			wantServices: []string{"svc-a"},
		},
		{
			name: "group column in middle maps correctly",
			resp: &qbtypes.QueryRangeResponse{
				Type: qbtypes.RequestTypeScalar,
				Data: qbtypes.QueryData{
					Results: []any{&qbtypes.ScalarData{
						QueryName: "A",
						Columns:   []*qbtypes.ColumnDescriptor{agg(0), groupCol, agg(1), agg(2), agg(3), agg(4)},
						Data:      [][]any{{float64(200.0), "svc-mid", float64(50.0), uint64(20), uint64(5), uint64(2)}},
					},
					},
				},
			},
			startMs: 0, endMs: 10000, // 10s window -> callRate = 2, errorRate=25%, fourXXRate=10%
			wantItems: []*servicetypesv1.ResponseItem{
				{
					ServiceName:  "svc-mid",
					Percentile99: 200.0,
					AvgDuration:  50.0,
					NumCalls:     20,
					CallRate:     2.0,
					NumErrors:    5,
					ErrorRate:    25.0, // in percentage
					Num4XX:       2,
					FourXXRate:   10.0, // in percentage
					DataWarning:  servicetypesv1.DataWarning{TopLevelOps: []string{}},
				},
			},
			wantServices: []string{"svc-mid"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotItems, gotServices := m.mapQueryRangeRespToServices(tt.resp, tt.startMs, tt.endMs)
			assert.Equal(t, tt.wantServices, gotServices)
			assert.Equal(t, len(tt.wantItems), len(gotItems))
			if len(tt.wantItems) == 1 {
				assert.InDelta(t, tt.wantItems[0].Percentile99, gotItems[0].Percentile99, 1e-9)
				assert.InDelta(t, tt.wantItems[0].AvgDuration, gotItems[0].AvgDuration, 1e-9)
				assert.Equal(t, tt.wantItems[0].NumCalls, gotItems[0].NumCalls)
				assert.InDelta(t, tt.wantItems[0].CallRate, gotItems[0].CallRate, 1e-9)
				assert.Equal(t, tt.wantItems[0].NumErrors, gotItems[0].NumErrors)
				assert.InDelta(t, tt.wantItems[0].ErrorRate, gotItems[0].ErrorRate, 1e-9)
				assert.Equal(t, tt.wantItems[0].Num4XX, gotItems[0].Num4XX)
				assert.InDelta(t, tt.wantItems[0].FourXXRate, gotItems[0].FourXXRate, 1e-9)
				assert.Equal(t, tt.wantItems[0].DataWarning.TopLevelOps, gotItems[0].DataWarning.TopLevelOps)
				assert.Equal(t, tt.wantItems[0].ServiceName, gotItems[0].ServiceName)
			}
		})
	}
}
