package v4

import (
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
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
			want: "trace_id != ''",
		},
		{
			name: "exists top level column- number",
			args: args{
				op:   v3.FilterOperatorNotExists,
				item: v3.FilterItem{Key: v3.AttributeKey{Key: "severity_number", DataType: v3.AttributeKeyDataTypeArrayFloat64, Type: v3.AttributeKeyTypeUnspecified}},
			},
			want: "severity_number = 0",
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
			want: "resources_string['service.name'] ILIKE '%test%'",
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
					Value:    "test%",
				},
			},
			want: "resources_string['service.name'] ILIKE 'test%'",
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

func Test_orderByAttributeKeyTags(t *testing.T) {
	type args struct {
		panelType v3.PanelType
		items     []v3.OrderBy
		tags      []v3.AttributeKey
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "Test 1",
			args: args{
				panelType: v3.PanelTypeGraph,
				items: []v3.OrderBy{
					{
						ColumnName: "name",
						Order:      "asc",
					},
					{
						ColumnName: constants.SigNozOrderByValue,
						Order:      "desc",
					},
				},
				tags: []v3.AttributeKey{
					{Key: "name"},
				},
			},
			want: "`name` asc,value desc",
		},
		{
			name: "Test Graph item not present in tag",
			args: args{
				panelType: v3.PanelTypeGraph,
				items: []v3.OrderBy{
					{
						ColumnName: "name",
						Order:      "asc",
					},
					{
						ColumnName: "bytes",
						Order:      "asc",
					},
					{
						ColumnName: "method",
						Order:      "asc",
					},
				},
				tags: []v3.AttributeKey{
					{Key: "name"},
					{Key: "bytes"},
				},
			},
			want: "`name` asc,`bytes` asc",
		},
		{
			name: "Test panel list",
			args: args{
				panelType: v3.PanelTypeList,
				items: []v3.OrderBy{
					{
						ColumnName: "name",
						Order:      "asc",
					},
					{
						ColumnName: constants.SigNozOrderByValue,
						Order:      "asc",
					},
					{
						ColumnName: "bytes",
						Order:      "asc",
						IsColumn:   true,
						Type:       v3.AttributeKeyTypeTag,
						DataType:   v3.AttributeKeyDataTypeString,
					},
				},
				tags: []v3.AttributeKey{
					{Key: "name"},
				},
			},
			want: "`name` asc,value asc,`attribute_string_bytes` asc",
		},
		{
			name: "test 4",
			args: args{
				panelType: v3.PanelTypeList,
				items: []v3.OrderBy{
					{
						ColumnName: "name",
						Order:      "asc",
					},
					{
						ColumnName: constants.SigNozOrderByValue,
						Order:      "asc",
					},
					{
						ColumnName: "response_time",
						Order:      "desc",
						Key:        "response_time",
						Type:       v3.AttributeKeyTypeTag,
						DataType:   v3.AttributeKeyDataTypeString,
					},
				},
				tags: []v3.AttributeKey{
					{Key: "name"},
					{Key: "value"},
				},
			},
			want: "`name` asc,value asc,attributes_string['response_time'] desc",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := orderByAttributeKeyTags(tt.args.panelType, tt.args.items, tt.args.tags); got != tt.want {
				t.Errorf("orderByAttributeKeyTags() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_generateAggregateClause(t *testing.T) {
	type args struct {
		op          v3.AggregateOperator
		aggKey      string
		step        int64
		preferRPM   bool
		timeFilter  string
		whereClause string
		groupBy     string
		having      string
		orderBy     string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "test rate",
			args: args{
				op:          v3.AggregateOperatorRate,
				aggKey:      "test",
				step:        60,
				preferRPM:   false,
				timeFilter:  "(timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458)",
				whereClause: " AND attributes_string['service.name'] = 'test'",
				groupBy:     " group by `user_name`",
				having:      "",
				orderBy:     " order by `user_name` desc",
			},
			want: " count(test)/60.000000 as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND " +
				"(ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND attributes_string['service.name'] = 'test' " +
				"group by `user_name` order by `user_name` desc",
		},
		{
			name: "test P10 with all args",
			args: args{
				op:          v3.AggregateOperatorRate,
				aggKey:      "test",
				step:        60,
				preferRPM:   false,
				timeFilter:  "(timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458)",
				whereClause: " AND attributes_string['service.name'] = 'test'",
				groupBy:     " group by `user_name`",
				having:      " having value > 10",
				orderBy:     " order by `user_name` desc",
			},
			want: " count(test)/60.000000 as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND " +
				"(ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND attributes_string['service.name'] = 'test' group by `user_name` having value > 10 order by " +
				"`user_name` desc",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := generateAggregateClause(tt.args.op, tt.args.aggKey, tt.args.step, tt.args.preferRPM, tt.args.timeFilter, tt.args.whereClause, tt.args.groupBy, tt.args.having, tt.args.orderBy)
			if (err != nil) != tt.wantErr {
				t.Errorf("generateAggreagteClause() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("generateAggreagteClause() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_buildLogsQuery(t *testing.T) {
	type args struct {
		panelType       v3.PanelType
		start           int64
		end             int64
		step            int64
		mq              *v3.BuilderQuery
		graphLimitQtype string
		preferRPM       bool
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "build logs query",
			args: args{
				panelType: v3.PanelTypeTable,
				start:     1680066360726210000,
				end:       1680066458000000000,
				step:      1000,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorCount,
					Filters: &v3.FilterSet{
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
					GroupBy: []v3.AttributeKey{
						{
							Key:      "user_name",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "user_name",
							Order:      "desc",
						},
					},
				},
			},
			want: "SELECT attributes_string['user_name'] as `user_name`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 " +
				"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"AND attributes_string['service.name'] = 'test' AND mapContains(attributes_string, 'service.name') AND mapContains(attributes_string, 'user_name') " +
				"group by `user_name` order by `user_name` desc",
		},
		{
			name: "build logs query noop",
			args: args{
				panelType: v3.PanelTypeList,
				start:     1680066360726210000,
				end:       1680066458000000000,
				step:      1000,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorNoOp,
					Filters: &v3.FilterSet{
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
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "desc",
						},
					},
				},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string " +
				"from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"AND attributes_string['service.name'] = 'test' AND mapContains(attributes_string, 'service.name') order by timestamp desc",
		},
		{
			name: "build logs query with all args",
			args: args{
				panelType: v3.PanelTypeGraph,
				start:     1680066360726210000,
				end:       1680066458000000000,
				step:      60,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorAvg,
					AggregateAttribute: v3.AttributeKey{
						Key:      "duration",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeFloat64,
					},
					Filters: &v3.FilterSet{
						Items: []v3.FilterItem{
							{
								Key: v3.AttributeKey{
									Key:      "service.name",
									DataType: v3.AttributeKeyDataTypeString,
									Type:     v3.AttributeKeyTypeResource,
								},
								Operator: v3.FilterOperatorEqual,
								Value:    "test",
							},
							{
								Key: v3.AttributeKey{
									Key:      "duration",
									DataType: v3.AttributeKeyDataTypeFloat64,
									Type:     v3.AttributeKeyTypeTag,
								},
								Operator: v3.FilterOperatorGreaterThan,
								Value:    1000,
							},
						},
					},
					GroupBy: []v3.AttributeKey{
						{
							Key:      "host",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeResource,
						},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "host",
							Order:      "desc",
						},
					},
				},
			},
			want: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, resources_string['host'] as `host`, avg(attributes_number['duration']) as value " +
				"from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"AND attributes_number['duration'] > 1000.000000 AND mapContains(attributes_number, 'duration') AND mapContains(attributes_number, 'duration') AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) " +
				"AND simpleJSONExtractString(labels, 'service.name') = 'test' AND labels like '%service.name%test%' AND ( (simpleJSONHas(labels, 'host') AND labels like '%host%') ))) " +
				"group by `host`,ts order by `host` desc",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildLogsQuery(tt.args.panelType, tt.args.start, tt.args.end, tt.args.step, tt.args.mq, tt.args.graphLimitQtype, tt.args.preferRPM)
			if (err != nil) != tt.wantErr {
				t.Errorf("buildLogsQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("buildLogsQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPrepareLogsQuery(t *testing.T) {
	type args struct {
		start     int64
		end       int64
		queryType v3.QueryType
		panelType v3.PanelType
		mq        *v3.BuilderQuery
		options   v3.QBOptions
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "TABLE: Test count with JSON Filter Array, groupBy, orderBy",
			args: args{
				start:     1680066360726210000,
				end:       1680066458000000000,
				panelType: v3.PanelTypeTable,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorCount,
					Expression:        "A",
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items: []v3.FilterItem{
							{
								Key: v3.AttributeKey{
									Key:      "body.requestor_list[*]",
									DataType: "array(string)",
									IsJSON:   true,
								},
								Operator: "has",
								Value:    "index_service",
							},
						},
					},
					GroupBy: []v3.AttributeKey{
						{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
					},
					OrderBy: []v3.OrderBy{
						{ColumnName: "name", Order: "DESC"},
					},
				},
			},
			want: "SELECT attributes_string['name'] as `name`, resources_string['host'] as `host`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where " +
				"(timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND lower(body) like lower('%requestor_list%') " +
				"AND lower(body) like lower('%index_service%') AND has(JSONExtract(JSON_QUERY(body, '$.\"requestor_list\"[*]'), 'Array(String)'), 'index_service') AND mapContains(attributes_string, 'name') AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) AND " +
				"( (simpleJSONHas(labels, 'host') AND labels like '%host%') ))) group by `name`,`host` order by `name` DESC",
		},
		{
			name: "Test TS with limit- first",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeGraph,
				mq: &v3.BuilderQuery{
					QueryName:          "A",
					StepInterval:       60,
					AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					AggregateOperator:  v3.AggregateOperatorCountDistinct,
					Expression:         "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
						{Key: v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "app", Operator: "="},
					},
					},
					Limit:   10,
					GroupBy: []v3.AttributeKey{{Key: "user", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
				},
				options: v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: true},
			},
			want: "SELECT `user` from (SELECT attributes_string['user'] as `user`, toFloat64(count(distinct(attributes_string['name']))) as value from signoz_logs.distributed_logs_v2 " +
				"where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND attributes_string['method'] = 'GET' " +
				"AND mapContains(attributes_string, 'method') AND mapContains(attributes_string, 'user') AND mapContains(attributes_string, 'name') AND (resource_fingerprint GLOBAL IN " +
				"(SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) AND simpleJSONExtractString(labels, 'service.name') = 'app' " +
				"AND labels like '%service.name%app%')) group by `user` order by value DESC) LIMIT 10",
		},
		{
			name: "Test TS with limit- second",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeGraph,
				mq: &v3.BuilderQuery{
					QueryName:          "A",
					StepInterval:       60,
					AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					AggregateOperator:  v3.AggregateOperatorCountDistinct,
					Expression:         "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
						{Key: v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "app", Operator: "="},
					},
					},
					GroupBy: []v3.AttributeKey{{Key: "user", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					Limit:   2,
				},
				options: v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit},
			},
			want: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, attributes_string['user'] as `user`, toFloat64(count(distinct(attributes_string['name']))) as value " +
				"from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND " +
				"attributes_string['method'] = 'GET' AND mapContains(attributes_string, 'method') AND mapContains(attributes_string, 'user') AND mapContains(attributes_string, 'name') AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) AND " +
				"simpleJSONExtractString(labels, 'service.name') = 'app' AND labels like '%service.name%app%')) AND (`user`) GLOBAL IN (#LIMIT_PLACEHOLDER) group by `user`,ts order by value DESC",
		},
		{
			name: "Live Tail Query",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
					},
					},
				},
				options: v3.QBOptions{IsLivetailQuery: true},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string " +
				"from signoz_logs.distributed_logs_v2 where attributes_string['method'] = 'GET' AND mapContains(attributes_string, 'method') AND ",
		},
		{
			name: "Live Tail Query with resource attribute",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
						{Key: v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "app", Operator: "contains"},
					},
					},
				},
				options: v3.QBOptions{IsLivetailQuery: true},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string from " +
				"signoz_logs.distributed_logs_v2 where attributes_string['method'] = 'GET' AND mapContains(attributes_string, 'method') AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE simpleJSONExtractString(lower(labels), 'service.name') LIKE '%app%' AND lower(labels) like '%service.name%app%' AND ",
		},
		{
			name: "Live Tail Query W/O filter",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
				},
				options: v3.QBOptions{IsLivetailQuery: true},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string " +
				"from signoz_logs.distributed_logs_v2 where ",
		},
		{
			name: "Table query with limit",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeTable,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorCount,
					Expression:        "A",
					Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
					Limit:             10,
				},
			},
			want: "SELECT toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) order by value DESC LIMIT 10",
		},
		{
			name: "Test limit less than pageSize - order by ts",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
					OrderBy:           []v3.OrderBy{{ColumnName: constants.TIMESTAMP, Order: "desc", Key: constants.TIMESTAMP, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}},
					Limit:             1,
					Offset:            0,
					PageSize:          5,
				},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string from " +
				"signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"order by timestamp desc LIMIT 1",
		},
		{
			name: "Test limit greater than pageSize - order by ts",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "id", Type: v3.AttributeKeyTypeUnspecified, DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Operator: v3.FilterOperatorLessThan, Value: "2TNh4vp2TpiWyLt3SzuadLJF2s4"},
					}},
					OrderBy:  []v3.OrderBy{{ColumnName: constants.TIMESTAMP, Order: "desc", Key: constants.TIMESTAMP, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}},
					Limit:    100,
					Offset:   10,
					PageSize: 10,
				},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string from " +
				"signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"AND id < '2TNh4vp2TpiWyLt3SzuadLJF2s4' order by timestamp desc LIMIT 10",
		},
		{
			name: "Test limit less than pageSize  - order by custom",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
					OrderBy:           []v3.OrderBy{{ColumnName: "method", Order: "desc", Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					Limit:             1,
					Offset:            0,
					PageSize:          5,
				},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string from " +
				"signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) " +
				"order by attributes_string['method'] desc LIMIT 1 OFFSET 0",
		},
		{
			name: "Test limit greater than pageSize - order by custom",
			args: args{
				start:     1680066360726,
				end:       1680066458000,
				queryType: v3.QueryTypeBuilder,
				panelType: v3.PanelTypeList,
				mq: &v3.BuilderQuery{
					QueryName:         "A",
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Expression:        "A",
					Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
						{Key: v3.AttributeKey{Key: "id", Type: v3.AttributeKeyTypeUnspecified, DataType: v3.AttributeKeyDataTypeString, IsColumn: true}, Operator: v3.FilterOperatorLessThan, Value: "2TNh4vp2TpiWyLt3SzuadLJF2s4"},
					}},
					OrderBy:  []v3.OrderBy{{ColumnName: "method", Order: "desc", Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					Limit:    100,
					Offset:   50,
					PageSize: 50,
				},
			},
			want: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string from " +
				"signoz_logs.distributed_logs_v2 where (timestamp >= 1680066360726000000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND " +
				"id < '2TNh4vp2TpiWyLt3SzuadLJF2s4' order by attributes_string['method'] desc LIMIT 50 OFFSET 50",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := PrepareLogsQuery(tt.args.start, tt.args.end, tt.args.queryType, tt.args.panelType, tt.args.mq, tt.args.options)
			if (err != nil) != tt.wantErr {
				t.Errorf("PrepareLogsQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("PrepareLogsQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}
