package implservices

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestBuildQueryRangeRequest(t *testing.T) {
	m := &module{}

	tests := []struct {
		name     string
		req      servicetypes.Request
		wantErr  string
		assertOK func(t *testing.T, qr qbtypes.QueryRangeRequest, startMs, endMs uint64)
	}{
		{
			name: "valid with tags builds scope+filter and query",
			req: servicetypes.Request{
				Start: "1000000000", // 1s in ns -> 1000 ms
				End:   "2000000000", // 2s in ns -> 2000 ms
				Tags: []servicetypes.TagFilterItem{
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
			req: servicetypes.Request{
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
			req:     servicetypes.Request{Start: "abc", End: "100"},
			wantErr: "invalid start time",
		},
		{
			name:    "invalid end",
			req:     servicetypes.Request{Start: "100", End: "abc"},
			wantErr: "invalid end time",
		},
		{
			name:    "start not before end",
			req:     servicetypes.Request{Start: "2000", End: "2000"},
			wantErr: "start must be before end",
		},
		{
			name:    "start greater than end",
			req:     servicetypes.Request{Start: "2001", End: "2000"},
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
