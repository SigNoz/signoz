package v4

import (
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func Test_getClickHouseTracesColumnType(t *testing.T) {
	type args struct {
		columnType v3.AttributeKeyType
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "tag",
			args: args{
				columnType: v3.AttributeKeyTypeTag,
			},
			want: "attributes",
		},
		{
			name: "resource",
			args: args{
				columnType: v3.AttributeKeyTypeResource,
			},
			want: "resources",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getClickHouseTracesColumnType(tt.args.columnType); got != tt.want {
				t.Errorf("GetClickhouseTracesColumnType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getClickHouseTracesColumnDataType(t *testing.T) {
	type args struct {
		columnDataType v3.AttributeKeyDataType
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "string",
			args: args{
				columnDataType: v3.AttributeKeyDataTypeString,
			},
			want: "string",
		},
		{
			name: "float64",
			args: args{
				columnDataType: v3.AttributeKeyDataTypeFloat64,
			},
			want: "number",
		},
		{
			name: "int64",
			args: args{
				columnDataType: v3.AttributeKeyDataTypeInt64,
			},
			want: "number",
		},
		{
			name: "bool",
			args: args{
				columnDataType: v3.AttributeKeyDataTypeBool,
			},
			want: "bool",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getClickHouseTracesColumnDataType(tt.args.columnDataType); got != tt.want {
				t.Errorf("getClickhouseTracesColumnDataType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getColumnName(t *testing.T) {
	type args struct {
		key v3.AttributeKey
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "tag",
			args: args{
				key: v3.AttributeKey{Key: "data", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			},
			want: "attributes_string['data']",
		},
		{
			name: "column",
			args: args{
				key: v3.AttributeKey{Key: "data", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			want: "`attribute_string_data`",
		},
		{
			name: "static column",
			args: args{
				key: v3.AttributeKey{Key: "spanKind", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			want: "spanKind",
		},
		{
			name: "missing meta",
			args: args{
				key: v3.AttributeKey{Key: "xyz"},
			},
			want: "attributes_string['xyz']",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getColumnName(tt.args.key); got != tt.want {
				t.Errorf("getColumnName() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getSelectLabels(t *testing.T) {
	type args struct {
		groupBy []v3.AttributeKey
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "count",
			args: args{
				groupBy: []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: " attributes_string['user_name'] as `user_name`",
		},
		{
			name: "multiple group by",
			args: args{
				groupBy: []v3.AttributeKey{
					{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, // static col
					{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: true},
				},
			},
			want: " name as `name`, `resource_string_service_name` as `service_name`",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getSelectLabels(tt.args.groupBy); got != tt.want {
				t.Errorf("getSelectLabels() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_buildTracesFilterQuery(t *testing.T) {
	type args struct {
		fs *v3.FilterSet
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "Test buildTracesFilterQuery in, nin",
			args: args{
				fs: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{"GET", "POST"}, Operator: v3.FilterOperatorIn},
					{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{"PUT"}, Operator: v3.FilterOperatorNotIn},
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: []interface{}{"server"}, Operator: v3.FilterOperatorNotIn},
				}},
			},
			want:    "attributes_string['method'] IN ['GET','POST'] AND attributes_string['method'] NOT IN ['PUT']",
			wantErr: false,
		},
		{
			name: "Test buildTracesFilterQuery not eq, neq, gt, lt, gte, lte",
			args: args{
				fs: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 102, Operator: v3.FilterOperatorEqual},
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 100, Operator: v3.FilterOperatorNotEqual},
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: v3.FilterOperatorGreaterThan},
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 200, Operator: v3.FilterOperatorLessThan},
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: v3.FilterOperatorGreaterThanOrEq},
					{Key: v3.AttributeKey{Key: "duration", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 200, Operator: v3.FilterOperatorLessThanOrEq},
				}},
			},
			want: "attributes_number['duration'] = 102 AND attributes_number['duration'] != 100 AND attributes_number['duration'] > 10 AND attributes_number['duration'] < 200" +
				" AND attributes_number['duration'] >= 10 AND attributes_number['duration'] <= 200",
			wantErr: false,
		},
		{
			name: "Test contains, ncontains, like, nlike, regex, nregex",
			args: args{
				fs: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: v3.FilterOperatorContains},
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "103", Operator: v3.FilterOperatorNotContains},
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: v3.FilterOperatorLike},
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102", Operator: v3.FilterOperatorNotLike},
					{Key: v3.AttributeKey{Key: "path", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "/mypath", Operator: v3.FilterOperatorRegex},
					{Key: v3.AttributeKey{Key: "path", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "/health.*", Operator: v3.FilterOperatorNotRegex},
				}},
			},
			want: "attributes_string['host'] ILIKE '%102.%' AND attributes_string['host'] NOT ILIKE '%103%' AND attributes_string['host'] ILIKE '102.' AND attributes_string['host'] NOT ILIKE '102' AND " +
				"match(`attribute_string_path`, '/mypath') AND NOT match(`attribute_string_path`, '/health.*')",
		},
		{
			name: "Test exists, nexists",
			args: args{
				fs: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: v3.FilterOperatorExists},
					{Key: v3.AttributeKey{Key: "path", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Operator: v3.FilterOperatorNotExists},
				}},
			},
			want: "mapContains(attributes_string, 'host') AND path = ''",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildTracesFilterQuery(tt.args.fs)
			if (err != nil) != tt.wantErr {
				t.Errorf("buildTracesFilterQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("buildTracesFilterQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_handleEmptyValuesInGroupBy(t *testing.T) {
	type args struct {
		groupBy []v3.AttributeKey
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "Test handleEmptyValuesInGroupBy",
			args: args{
				groupBy: []v3.AttributeKey{{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want:    "mapContains(attributes_string, 'bytes')",
			wantErr: false,
		},
		{
			name: "Test handleEmptyValuesInGroupBy",
			args: args{
				groupBy: []v3.AttributeKey{{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
			},
			want:    "",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := handleEmptyValuesInGroupBy(tt.args.groupBy)
			if (err != nil) != tt.wantErr {
				t.Errorf("handleEmptyValuesInGroupBy() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("handleEmptyValuesInGroupBy() = %v, want %v", got, tt.want)
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
			name: "test",
			args: args{
				panelType: v3.PanelTypeGraph,
				items:     []v3.OrderBy{{ColumnName: "name", Order: "ASC"}},
				tags:      []v3.AttributeKey{{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: "`name` ASC",
		},
		{
			name: "order by value",
			args: args{
				panelType: v3.PanelTypeGraph,
				items:     []v3.OrderBy{{ColumnName: "name", Order: "ASC"}, {ColumnName: constants.SigNozOrderByValue, Order: "DESC"}},
				tags:      []v3.AttributeKey{{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			},
			want: "`name` ASC,value DESC",
		},
		{
			name: "test",
			args: args{
				panelType: v3.PanelTypeList,
				items: []v3.OrderBy{{ColumnName: "status", Order: "DESC", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					{ColumnName: "route", Order: "DESC", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
			},
			want: "attributes_string['status'] DESC,`attribute_string_route` DESC",
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

func Test_buildTracesQuery(t *testing.T) {
	type args struct {
		start     int64
		end       int64
		step      int64
		mq        *v3.BuilderQuery
		panelType v3.PanelType
		options   v3.QBOptions
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "Test buildTracesQuery",
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
								Key:      v3.AttributeKey{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
								Value:    100,
								Operator: v3.FilterOperatorEqual,
							},
						},
					},
					GroupBy: []v3.AttributeKey{{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					OrderBy: []v3.OrderBy{
						{ColumnName: "http.method", Order: "ASC"}},
				},
			},
			want: "SELECT  attributes_string['http.method'] as `http.method`, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v3 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
				"AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND attributes_string['http.method'] = '100' AND mapContains(attributes_string, 'http.method') " +
				"group by `http.method` order by `http.method` ASC",
		},
		{
			name: "Test buildTracesQuery",
			args: args{
				panelType: v3.PanelTypeTable,
				start:     1680066360726210000,
				end:       1680066458000000000,
				step:      1000,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorCount,
					Filters: &v3.FilterSet{
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeInt64}, Value: 100, Operator: ">"},
							{Key: v3.AttributeKey{Key: "service.name", Type: v3.AttributeKeyTypeResource, DataType: v3.AttributeKeyDataTypeString}, Value: "myService", Operator: "="},
						},
					},
					GroupBy: []v3.AttributeKey{{Key: "host", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeResource}},
					OrderBy: []v3.OrderBy{
						{ColumnName: "host", Order: "ASC"}},
				},
			},
			want: "SELECT  resources_number['host'] as `host`, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v3 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
				"AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND attributes_number['bytes'] > 100 AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND " +
				"(seen_at_ts_bucket_start <= 1680066458) AND simpleJSONExtractString(labels, 'service.name') = 'myService' AND labels like '%service.name%myService%' AND " +
				"( (simpleJSONHas(labels, 'host') AND labels like '%host%') ))) " +
				"group by `host` order by `host` ASC",
		},
		{
			name: "test noop list view",
			args: args{
				panelType: v3.PanelTypeList,
				start:     1680066360726210000,
				end:       1680066458000000000,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorNoOp,
					Filters:           &v3.FilterSet{},
					SelectColumns:     []v3.AttributeKey{{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
				},
			},
			want: "SELECT timestamp as timestamp_datetime, spanID, traceID, name as `name`, id as `id` from signoz_traces.distributed_signoz_index_v3 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
				"AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458)  order by timestamp DESC",
		},
		{
			name: "test noop trace view",
			args: args{
				panelType: v3.PanelTypeTrace,
				start:     1680066360726210000,
				end:       1680066458000000000,
				mq: &v3.BuilderQuery{
					AggregateOperator: v3.AggregateOperatorNoOp,
					Filters: &v3.FilterSet{
						Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
							{Key: v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "myService", Operator: "="},
						},
					},
				},
			},
			want: "SELECT subQuery.serviceName, subQuery.name, count() AS span_count, subQuery.durationNano, subQuery.traceID AS traceID FROM signoz_traces.distributed_signoz_index_v3 INNER JOIN " +
				"( SELECT * FROM (SELECT traceID, durationNano, serviceName, name FROM signoz_traces.signoz_index_v3 WHERE parentSpanID = '' AND (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') AND " +
				"(ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458)  AND attributes_string['method'] = 'GET' AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource " +
				"WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) AND simpleJSONExtractString(labels, 'service.name') = 'myService' AND labels like '%service.name%myService%')) " +
				"ORDER BY durationNano DESC LIMIT 1 BY traceID  LIMIT 100) AS inner_subquery ) AS subQuery ON signoz_traces.distributed_signoz_index_v3.traceID = subQuery.traceID WHERE (timestamp >= '1680066360726210000' AND " +
				"timestamp <= '1680066458000000000') AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) GROUP BY subQuery.traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY " +
				"subQuery.durationNano desc LIMIT 1 BY subQuery.traceID;",
		},
		{
			name: "Test order by value with having",
			args: args{
				panelType: v3.PanelTypeTable,
				start:     1680066360726210000,
				end:       1680066458000000000,
				mq: &v3.BuilderQuery{
					AggregateOperator:  v3.AggregateOperatorCountDistinct,
					Filters:            &v3.FilterSet{},
					AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					OrderBy:            []v3.OrderBy{{ColumnName: "#SIGNOZ_VALUE", Order: "ASC"}},
					Having: []v3.Having{
						{
							ColumnName: "name",
							Operator:   ">",
							Value:      10,
						},
					},
				},
			},
			want: "SELECT  toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v3 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') AND " +
				"(ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) having value > 10 order by value ASC",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildTracesQuery(tt.args.start, tt.args.end, tt.args.step, tt.args.mq, tt.args.panelType, tt.args.options)
			if (err != nil) != tt.wantErr {
				t.Errorf("buildTracesQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("buildTracesQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPrepareTracesQuery(t *testing.T) {
	type args struct {
		start     int64
		end       int64
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
			name: "test with limit - first",
			args: args{
				start:     1680066360726210000,
				end:       1680066458000000000,
				panelType: v3.PanelTypeTable,
				mq: &v3.BuilderQuery{
					StepInterval:       60,
					AggregateOperator:  v3.AggregateOperatorCountDistinct,
					Filters:            &v3.FilterSet{},
					AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					GroupBy:            []v3.AttributeKey{{Key: "serviceName", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					Limit:              10,
				},
				options: v3.QBOptions{
					GraphLimitQtype: constants.FirstQueryGraphLimit,
				},
			},
			want: "SELECT `serviceName` from (SELECT serviceName as `serviceName`, toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v3 " +
				"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) group by `serviceName`) LIMIT 10",
		},
		{
			name: "test with limit - second",
			args: args{
				start:     1680066360726210000,
				end:       1680066458000000000,
				panelType: v3.PanelTypeTable,
				mq: &v3.BuilderQuery{
					StepInterval:       60,
					AggregateOperator:  v3.AggregateOperatorCountDistinct,
					Filters:            &v3.FilterSet{},
					AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					GroupBy:            []v3.AttributeKey{{Key: "serviceName", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					Limit:              10,
				},
				options: v3.QBOptions{
					GraphLimitQtype: constants.SecondQueryGraphLimit,
				},
			},
			want: "SELECT  serviceName as `serviceName`, toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v3 where " +
				"(timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND (`serviceName`) GLOBAL IN (%s) group by `serviceName`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := PrepareTracesQuery(tt.args.start, tt.args.end, tt.args.panelType, tt.args.mq, tt.args.options)
			if (err != nil) != tt.wantErr {
				t.Errorf("PrepareTracesQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("PrepareTracesQuery() = %v, want %v", got, tt.want)
			}
		})
	}
}
