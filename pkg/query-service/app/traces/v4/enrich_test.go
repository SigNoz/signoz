package v4

import (
	"reflect"
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestEnrichTracesQuery(t *testing.T) {
	type args struct {
		query *v3.BuilderQuery
		keys  map[string]v3.AttributeKey
		want  *v3.BuilderQuery
	}
	tests := []struct {
		name string
		args args
	}{
		{
			name: "test 1",
			args: args{
				query: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag}, Value: 100, Operator: ">"},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
				keys: map[string]v3.AttributeKey{
					"bytes##tag##int64": {Key: "bytes", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag},
				},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeInt64}, Value: 100, Operator: ">"},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
			},
		},
		{
			name: "test service name",
			args: args{
				query: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "serviceName", DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Value: "myservice", Operator: "="},
							{Key: v3.AttributeKey{Key: "serviceName"}, Value: "myservice", Operator: "="},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
				keys: map[string]v3.AttributeKey{},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString}, Value: "myservice", Operator: "="},
							{Key: v3.AttributeKey{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString}, Value: "myservice", Operator: "="},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
			},
		},
		{
			name: "test mat attrs",
			args: args{
				query: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "http.route", DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Value: "/api", Operator: "="},
							{Key: v3.AttributeKey{Key: "msgSystem"}, Value: "name", Operator: "="},
							{Key: v3.AttributeKey{Key: "external_http_url"}, Value: "name", Operator: "="},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
				keys: map[string]v3.AttributeKey{},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "http.route", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "/api", Operator: "="},
							{Key: v3.AttributeKey{Key: "msgSystem", DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Value: "name", Operator: "="},
							{Key: v3.AttributeKey{Key: "external_http_url", DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Value: "name", Operator: "="},
						},
					},
					OrderBy: []v3.OrderBy{},
				},
			},
		},
		{
			name: "test aggregateattr, filter, groupby, order by",
			args: args{
				query: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorCount,
					AggregateAttribute: v3.AttributeKey{
						Key:      "http.route",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "http.route", DataType: v3.AttributeKeyDataTypeString}, Value: "/api", Operator: "="},
						},
					},
					GroupBy: []v3.AttributeKey{
						{Key: "http.route", DataType: v3.AttributeKeyDataTypeString},
						{Key: "msgSystem", DataType: v3.AttributeKeyDataTypeString},
					},
					OrderBy: []v3.OrderBy{
						{ColumnName: "httpRoute", Order: v3.DirectionAsc},
					},
				},
				keys: map[string]v3.AttributeKey{
					"http.route##tag##string": {Key: "http.route", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
				},
				want: &v3.BuilderQuery{
					AggregateAttribute: v3.AttributeKey{
						Key:      "http.route",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: true,
					},
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "http.route", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "/api", Operator: "="},
						},
					},
					GroupBy: []v3.AttributeKey{
						{Key: "http.route", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
						{Key: "msgSystem", DataType: v3.AttributeKeyDataTypeString, IsJSON: false, IsColumn: true},
					},
					OrderBy: []v3.OrderBy{
						{Key: "httpRoute", Order: v3.DirectionAsc, ColumnName: "httpRoute", DataType: v3.AttributeKeyDataTypeString, IsColumn: true},
					},
				},
			},
		},
		{
			name: "enrich default values",
			args: args{
				query: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "testattr"}},
						},
					},
					OrderBy: []v3.OrderBy{{ColumnName: "timestamp", Order: v3.DirectionAsc}},
				},
				keys: map[string]v3.AttributeKey{},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Items: []v3.FilterItem{{Key: v3.AttributeKey{Key: "testattr", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString}}},
					},
					// isColumn won't matter in timestamp as it will always be a column
					OrderBy: []v3.OrderBy{{Key: "timestamp", Order: v3.DirectionAsc, ColumnName: "timestamp"}},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			EnrichTracesQuery(tt.args.query, tt.args.keys)
			// Check AggregateAttribute
			if tt.args.query.AggregateAttribute.Key != "" && !reflect.DeepEqual(tt.args.query.AggregateAttribute, tt.args.want.AggregateAttribute) {
				t.Errorf("EnrichTracesQuery() AggregateAttribute = %v, want %v", tt.args.query.AggregateAttribute, tt.args.want.AggregateAttribute)
			}

			// Check Filters
			if tt.args.query.Filters != nil && !reflect.DeepEqual(tt.args.query.Filters, tt.args.want.Filters) {
				t.Errorf("EnrichTracesQuery() Filters = %v, want %v", tt.args.query.Filters, tt.args.want.Filters)
			}

			// Check GroupBy
			if tt.args.query.GroupBy != nil && !reflect.DeepEqual(tt.args.query.GroupBy, tt.args.want.GroupBy) {
				t.Errorf("EnrichTracesQuery() GroupBy = %v, want %v", tt.args.query.GroupBy, tt.args.want.GroupBy)
			}

			// Check OrderBy
			if tt.args.query.OrderBy != nil && !reflect.DeepEqual(tt.args.query.OrderBy, tt.args.want.OrderBy) {
				t.Errorf("EnrichTracesQuery() OrderBy = %v, want %v", tt.args.query.OrderBy, tt.args.want.OrderBy)
			}
		})
	}
}
