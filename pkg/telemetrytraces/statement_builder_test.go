package telemetrytraces

import (
	"context"
	"reflect"
	"testing"
	"time"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestBuildQuery(t *testing.T) {
	cases := []struct {
		name         string
		query        qbv5.QueryBuilderQuery
		expected     string
		expectedArgs []any
	}{
		{
			name: "trace query",
			query: qbv5.QueryBuilderQuery{
				Name: "avg(duration_nano)",
				Aggregations: []qbv5.Aggregation{
					{
						Expression: "avg(duration_nano)",
					},
					{
						Expression: "sum(duration_nano)",
					},
				},
				StepInterval: qbv5.Step{10 * time.Second},
				Signal:       telemetrytypes.SignalTraces,
				Filter: &qbv5.Filter{
					Expression: "http.status_code = 200",
				},
				GroupBy: []qbv5.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: "avg(duration_nano)",
		},
	}

	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"status_code": {
			{
				Name:          "status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"has_error": {
			{
				Name:          "has_error",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"http.route": {
			{
				Name:          "http.route",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.status_code": {
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"duration_nano": {
			{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"quantity": {
			{
				Name:          "quantity",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"item.price": {
			{
				Name:          "item.price",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Materialized:  true,
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	aggRewriter := NewAggExprRewriter(fm)
	compiler := NewCompiler()

	stmtBuilder := NewTraceQueryStatementBuilder(nil)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			sql, args, err := stmtBuilder.Build(context.Background(), 1, 2, qbv5.RequestTypeTimeSeries, c.query)
			if err != nil {
				t.Fatalf("error building query: %v", err)
			}
			if sql != c.expected {
				t.Fatalf("expected query to be %s, but got %s", c.expected, sql)
			}
			if !reflect.DeepEqual(args, c.expectedArgs) {
				t.Fatalf("expected args to be %v, but got %v", c.expectedArgs, args)
			}
		})
	}
}

func TestBuildQueryPanelTable(t *testing.T) {
	cases := []struct {
		name         string
		query        *qbv5.QueryBuilderQuery
		expected     string
		expectedArgs []any
	}{
		{
			name: "trace query",
			query: &qbv5.QueryBuilderQuery{
				Name: "avg(duration_nano)",
				Aggregations: []*qbv5.Aggregation{
					{
						Expression: "avg(duration_nano)",
					},
					{
						Expression: "sum(duration_nano)",
					},
				},
				StepInterval: 10 * time.Second,
				Signal:       telemetrytypes.SignalTraces,
				Filter: &qbv5.Filter{
					Expression: "http.status_code = 200",
				},
				GroupBy: []*qbv5.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: "avg(duration_nano)",
		},
	}

	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"status_code": {
			{
				Name:          "status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"has_error": {
			{
				Name:          "has_error",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"http.route": {
			{
				Name:          "http.route",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.status_code": {
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"duration_nano": {
			{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"quantity": {
			{
				Name:          "quantity",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"item.price": {
			{
				Name:          "item.price",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Materialized:  true,
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			sql, args, err := DefaultTraceQueryBuilder.BuildQuery(1, 2, qbv5.PanelTypeTable, c.query, fieldKeys)
			if err != nil {
				t.Fatalf("error building query: %v", err)
			}
			if sql != c.expected {
				t.Fatalf("expected query to be %s, but got %s", c.expected, sql)
			}
			if !reflect.DeepEqual(args, c.expectedArgs) {
				t.Fatalf("expected args to be %v, but got %v", c.expectedArgs, args)
			}
		})
	}
}
