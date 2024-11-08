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
						},
					},
				},
				keys: map[string]v3.AttributeKey{},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString}, Value: "myservice", Operator: "="},
						},
					},
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
						},
					},
				},
				keys: map[string]v3.AttributeKey{},
				want: &v3.BuilderQuery{
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "http.route", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "/api", Operator: "="},
						},
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			EnrichTracesQuery(tt.args.query, tt.args.keys)
			if !reflect.DeepEqual(tt.args.query.Filters.Items[0].Key, tt.args.want.Filters.Items[0].Key) {
				t.Errorf("EnrichTracesQuery() = %v, want %v", tt.args.query, tt.args.want)
			}
		})
	}
}
