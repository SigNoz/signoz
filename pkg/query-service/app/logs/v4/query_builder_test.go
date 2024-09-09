package v4

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func Test_getClickhouseKey(t *testing.T) {
	type args struct {
		key v3.AttributeKey
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "attribute",
			args: args{
				key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			},
			want: "attributes_string['user_name']",
		},
		{
			name: "resource",
			args: args{
				key: v3.AttributeKey{Key: "servicename", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			},
			want: "resources_string['servicename']",
		},
		{
			name: "selected field",
			args: args{
				key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			want: "`attribute_number_bytes`",
		},
		{
			name: "selected field resource",
			args: args{
				key: v3.AttributeKey{Key: "servicename", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: true},
			},
			want: "`resource_string_servicename`",
		},
		{
			name: "top level key",
			args: args{
				key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString},
			},
			want: "trace_id",
		},
		{
			name: "name with -",
			args: args{
				key: v3.AttributeKey{Key: "service-name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			want: "`attribute_string_service-name`",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getClickhouseKey(tt.args.key); got != tt.want {
				t.Errorf("getClickhouseKey() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getSelectLabels(t *testing.T) {
	type args struct {
		aggregatorOperator v3.AggregateOperator
		groupBy            []v3.AttributeKey
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "count",
			args: args{
				aggregatorOperator: v3.AggregateOperatorCount,
				groupBy:            []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: " attributes_string['user_name'] as `user_name`,",
		},
		{
			name: "multiple group by",
			args: args{
				aggregatorOperator: v3.AggregateOperatorCount,
				groupBy: []v3.AttributeKey{
					{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: true},
				},
			},
			want: " attributes_string['user_name'] as `user_name`, `resource_string_service_name` as `service_name`,",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getSelectLabels(tt.args.aggregatorOperator, tt.args.groupBy); got != tt.want {
				t.Errorf("getSelectLabels() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getExistsNexistsFilter(t *testing.T) {
	type args struct {
		op   v3.FilterOperator
		item v3.FilterItem
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "exists",
			args: args{
				op:   v3.FilterOperatorExists,
				item: v3.FilterItem{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: "mapContains(attributes_string, 'user_name')",
		},
		{
			name: "not exists",
			args: args{
				op:   v3.FilterOperatorNotExists,
				item: v3.FilterItem{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: "not mapContains(attributes_string, 'user_name')",
		},
		{
			name: "exists mat column",
			args: args{
				op:   v3.FilterOperatorExists,
				item: v3.FilterItem{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
			},
			want: "`attribute_number_bytes_exists`=true",
		},
		{
			name: "exists top level column",
			args: args{
				op:   v3.FilterOperatorExists,
				item: v3.FilterItem{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified}},
			},
			want: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getExistsNexistsFilter(tt.args.op, tt.args.item); got != tt.want {
				t.Errorf("getExistsNexistsFilter() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_buildAttributeFilter(t *testing.T) {
	type args struct {
		item v3.FilterItem
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "build attribute filter",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "service.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: v3.FilterOperatorEqual,
					Value:    "test",
				},
			},
			want:    "resources_string['service.name'] = 'test'",
			wantErr: false,
		},
		{
			name: "test for value search across all attributes",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "__attrs",
						DataType: v3.AttributeKeyDataTypeString,
					},
					Operator: v3.FilterOperatorContains,
					Value:    "test",
				},
			},
			want: "has(mapValues(attributes_string), 'test')",
		},
		{
			name: "build attribute filter exists",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "service.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: v3.FilterOperatorExists,
				},
			},
			want:    "mapContains(resources_string, 'service.name')",
			wantErr: false,
		},
		{
			name: "build attribute filter regex",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "service.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: v3.FilterOperatorRegex,
					Value:    "^test",
				},
			},
			want: "match(resources_string['service.name'], '^test')",
		},
		{
			name: "build attribute filter contains",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "service.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: v3.FilterOperatorContains,
					Value:    "test",
				},
			},
			want: "resources_string['service.name'] LIKE '%test%'",
		},
		{
			name: "build attribute filter contains- body",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "body",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: v3.FilterOperatorContains,
					Value:    "test",
				},
			},
			want: "lower(body) LIKE lower('%test%')",
		},
		{
			name: "build attribute filter like",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "service.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: v3.FilterOperatorLike,
					Value:    "test",
				},
			},
			want: "resources_string['service.name'] LIKE 'test'",
		},
		{
			name: "build attribute filter like-body",
			args: args{
				item: v3.FilterItem{
					Key: v3.AttributeKey{
						Key:      "body",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: v3.FilterOperatorLike,
					Value:    "test",
				},
			},
			want: "lower(body) LIKE lower('test')",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildAttributeFilter(tt.args.item)
			if (err != nil) != tt.wantErr {
				t.Errorf("buildAttributeFilter() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("buildAttributeFilter() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_buildLogsTimeSeriesFilterQuery(t *testing.T) {
	type args struct {
		fs                 *v3.FilterSet
		groupBy            []v3.AttributeKey
		aggregateAttribute v3.AttributeKey
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "build logs time series filter query",
			args: args{
				fs: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "service.name",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "test",
						},
						{
							Key: v3.AttributeKey{
								Key:      "method",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "GET",
						},
					},
				},
			},
			want: "attributes_string['service.name'] = 'test' AND mapContains(attributes_string, 'service.name') " +
				"AND attributes_string['method'] = 'GET' AND mapContains(attributes_string, 'method')",
		},
		{
			name: "build logs time series filter query with group by and aggregate attribute",
			args: args{
				fs: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "service.name",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "test",
						},
					},
				},
				groupBy: []v3.AttributeKey{
					{
						Key:      "user_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
				},
				aggregateAttribute: v3.AttributeKey{
					Key:      "test",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				},
			},
			want: "attributes_string['service.name'] = 'test' AND mapContains(attributes_string, 'service.name') " +
				"AND mapContains(attributes_string, 'user_name') AND mapContains(attributes_string, 'test')",
		},
		{
			name: "build logs time series filter query with multiple group by and aggregate attribute",
			args: args{
				fs: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "service.name",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "test",
						},
					},
				},
				groupBy: []v3.AttributeKey{
					{
						Key:      "user_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					{
						Key:      "host",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "method",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: true,
					},
					{
						Key:      "trace_id",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
				},
				aggregateAttribute: v3.AttributeKey{
					Key:      "test",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				},
			},
			want: "attributes_string['service.name'] = 'test' AND mapContains(attributes_string, 'service.name') " +
				"AND mapContains(attributes_string, 'user_name') AND `attribute_string_method_exists`=true AND mapContains(attributes_string, 'test')",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildLogsTimeSeriesFilterQuery(tt.args.fs, tt.args.groupBy, tt.args.aggregateAttribute)
			if (err != nil) != tt.wantErr {
				t.Errorf("buildLogsTimeSeriesFilterQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("buildLogsTimeSeriesFilterQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}
