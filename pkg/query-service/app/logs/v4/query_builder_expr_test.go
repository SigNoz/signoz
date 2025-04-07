package v4

import (
	"reflect"
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
)

func TestPrepareLogsQueryExpr(t *testing.T) {
	type args struct {
		start     int64
		end       int64
		queryType v3.QueryType
		panelType v3.PanelType
		mq        *v3.BuilderQuery
		options   v3.QBOptions
	}
	tests := []struct {
		name         string
		args         args
		want         string
		wantErr      bool
		expectedArgs []any
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
					UseSearchExpr: true,
					SearchExpr:    `service.name="redis"`,
					GroupBy: []v3.AttributeKey{
						{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
					},
					OrderBy: []v3.OrderBy{
						{ColumnName: "name", Order: "DESC"},
					},
					FieldKeys: map[string][]types.TelemetryFieldKey{
						"service.name": {
							{
								Name:          "service.name",
								FieldContext:  types.FieldContextResource,
								FieldDataType: types.FieldDataTypeString,
							},
						},
					},
				},
			},
			want: "SELECT attributes_string['name'] as `name`, resources_string['host'] as `host`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where " +
				"(timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) AND (ts_bucket_start >= 1680064560 AND ts_bucket_start <= 1680066458) AND (resources_string['service.name'] = ?)" +
				" AND " +
				"(resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1680064560) AND (seen_at_ts_bucket_start <= 1680066458) AND " +
				"( (simpleJSONHas(labels, 'host') AND labels like '%host%') ))) group by `name`,`host` order by `name` DESC",
			expectedArgs: []any{"redis"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, args, err := PrepareLogsQuery(tt.args.start, tt.args.end, tt.args.queryType, tt.args.panelType, tt.args.mq, tt.args.options)
			if (err != nil) != tt.wantErr {
				t.Errorf("PrepareLogsQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("PrepareLogsQuery() = %v, want %v", got, tt.want)
			}
			if !reflect.DeepEqual(args, tt.expectedArgs) {
				t.Errorf("PrepareLogsQuery() = %v, want %v", args, tt.expectedArgs)
			}
		})
	}
}
