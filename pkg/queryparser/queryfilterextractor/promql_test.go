package queryfilterextractor

import (
	"reflect"
	"testing"
)

func TestPromQLFilterExtractor_Extract(t *testing.T) {
	extractor := NewPromQLFilterExtractor()

	tests := []struct {
		name               string
		query              string
		wantMetrics        []string
		wantGroupByColumns []ColumnInfo
		wantError          bool
	}{
		{
			name:               "P1 - Simple vector selector",
			query:              `http_requests_total{job="api"}`,
			wantMetrics:        []string{"http_requests_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P2 - Function call",
			query:              `rate(cpu_usage_seconds_total[5m])`,
			wantMetrics:        []string{"cpu_usage_seconds_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P3 - Aggregation with by()",
			query:              `sum by (pod,region) (rate(http_requests_total[5m]))`,
			wantMetrics:        []string{"http_requests_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "pod", OriginExpr: "pod", OriginField: "pod"}, {Name: "region", OriginExpr: "region", OriginField: "region"}},
		},
		{
			name:               "P4 - Aggregation with without()",
			query:              `sum without (instance) (rate(cpu_usage_total[1m]))`,
			wantMetrics:        []string{"cpu_usage_total"},
			wantGroupByColumns: []ColumnInfo{}, // without() means no grouping keys per spec
		},
		{
			name:               "P5 - Invalid: metric name set twice",
			query:              `sum(rate(http_requests_total{__name__!="http_requests_error_total"}[5m]))`,
			wantMetrics:        []string{},
			wantGroupByColumns: []ColumnInfo{},
			wantError:          true,
		},
		{
			name:               "P6 - Regex negative label",
			query:              `sum(rate(http_requests_total{status!~"5.."}[5m]))`,
			wantMetrics:        []string{"http_requests_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P7 - Nested aggregations",
			query:              `sum by (region) (max by (pod, region) (cpu_usage_total{env="prod"}))`,
			wantMetrics:        []string{"cpu_usage_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "region", OriginExpr: "region", OriginField: "region"}}, // Only outermost grouping
		},
		{
			name:               "P7a - Nested aggregation: inner grouping ignored",
			query:              `sum(max by (pod) (cpu_usage_total{env="prod"}))`,
			wantMetrics:        []string{"cpu_usage_total"},
			wantGroupByColumns: []ColumnInfo{}, // Inner grouping is ignored when outer has no grouping (nestingLevel != 0 case)
		},
		{
			name:               "P8 - Arithmetic expression",
			query:              `(http_requests_total{job="api"} + http_errors_total{job="api"})`,
			wantMetrics:        []string{"http_requests_total", "http_errors_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P9 - Mix of positive metric & exclusion label",
			query:              `sum by (region)(rate(foo{job!="db"}[5m]))`,
			wantMetrics:        []string{"foo"},
			wantGroupByColumns: []ColumnInfo{{Name: "region", OriginExpr: "region", OriginField: "region"}},
		},
		{
			name:               "P10 - Function + aggregation",
			query:              `histogram_quantile(0.9, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`,
			wantMetrics:        []string{"http_request_duration_seconds_bucket"},
			wantGroupByColumns: []ColumnInfo{{Name: "le", OriginExpr: "le", OriginField: "le"}},
		},
		{
			name:               "P11 - Subquery",
			query:              `sum_over_time(cpu_usage_total[1h:5m])`,
			wantMetrics:        []string{"cpu_usage_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P12 - Nested aggregation inside subquery",
			query:              `max_over_time(sum(rate(cpu_usage_total[5m]))[1h:5m])`,
			wantMetrics:        []string{"cpu_usage_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P13 - Subquery with multiple metrics",
			query:              `avg_over_time((foo + bar)[10m:1m])`,
			wantMetrics:        []string{"foo", "bar"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P14 - Simple meta-metric",
			query:              `sum by (pod) (up)`,
			wantMetrics:        []string{"up"},
			wantGroupByColumns: []ColumnInfo{{Name: "pod", OriginExpr: "pod", OriginField: "pod"}},
		},
		{
			name:               "P15 - Binary operator unless",
			query:              `sum(rate(http_requests_total[5m])) unless avg(rate(http_errors_total[5m]))`,
			wantMetrics:        []string{"http_requests_total", "http_errors_total"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P16 - Vector matching",
			query:              `sum(rate(foo[5m])) / ignoring(instance) group_left(job) sum(rate(bar[5m]))`,
			wantMetrics:        []string{"foo", "bar"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P17 - Offset modifier with aggregation",
			query:              `sum by (env)(rate(cpu_usage_seconds_total{job="api"}[5m] offset 1h))`,
			wantMetrics:        []string{"cpu_usage_seconds_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "env", OriginExpr: "env", OriginField: "env"}},
		},
		{
			name:               "P18 - Invalid syntax",
			query:              `sum by ((foo)(bar))(http_requests_total)`,
			wantMetrics:        []string{},
			wantGroupByColumns: []ColumnInfo{},
			wantError:          true,
		},
		{
			name:               "P19 - Literal expression",
			query:              `2 + 3`,
			wantMetrics:        []string{},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "P20 - Aggregation inside subquery with deriv",
			query:              `deriv(sum by (instance)(rate(node_network_receive_bytes_total[5m]))[30m:5m])`,
			wantMetrics:        []string{"node_network_receive_bytes_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "instance", OriginExpr: "instance", OriginField: "instance"}}, // Aggregation is inside subquery, not outermost
		},
		{
			name:               "P21 - Aggregation inside subquery with avg_over_time",
			query:              `avg_over_time(sum by (job)(rate(http_requests_total[1m]))[30m:1m])`,
			wantMetrics:        []string{"http_requests_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "job", OriginExpr: "job", OriginField: "job"}}, // Aggregation is inside subquery, not outermost
		},
		{
			name:               "P22 - Aggregation inside subquery with max_over_time",
			query:              `max_over_time(sum by (pod)(rate(container_restarts_total[5m]))[1h:5m])`,
			wantMetrics:        []string{"container_restarts_total"},
			wantGroupByColumns: []ColumnInfo{{Name: "pod", OriginExpr: "pod", OriginField: "pod"}}, // Aggregation is inside subquery, not outermost
		},
		{
			name:               "P23 - Aggregation inside subquery with deriv (no rate)",
			query:              `deriv(sum by (namespace)(container_memory_working_set_bytes)[1h:10m])`,
			wantMetrics:        []string{"container_memory_working_set_bytes"},
			wantGroupByColumns: []ColumnInfo{{Name: "namespace", OriginExpr: "namespace", OriginField: "namespace"}}, // Aggregation is inside subquery, not outermost
		},
		{
			name:               "P24 - Aggregation inside subquery with histogram_quantile",
			query:              `histogram_quantile(0.95, avg_over_time(sum by (le, service)(rate(http_request_duration_seconds_bucket[5m]))[1h:5m]))`,
			wantMetrics:        []string{"http_request_duration_seconds_bucket"},
			wantGroupByColumns: []ColumnInfo{{Name: "le", OriginExpr: "le", OriginField: "le"}, {Name: "service", OriginExpr: "service", OriginField: "service"}}, // Aggregation is inside subquery, not outermost
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.query)

			// Check error expectation
			if tt.wantError {
				if err == nil {
					t.Errorf("Extract() expected error but got none, query: %s", tt.query)
				}
				return
			}
			if err != nil {
				t.Errorf("Extract() unexpected error = %v, query: %s", err, tt.query)
				return
			}

			// Sort for comparison
			gotMetrics := sortStrings(result.MetricNames)
			wantMetrics := sortStrings(tt.wantMetrics)

			if !reflect.DeepEqual(gotMetrics, wantMetrics) {
				t.Errorf("Extract() MetricNames = %v, want %v", gotMetrics, wantMetrics)
			}

			// Test GroupByColumns - need to normalize for comparison (order may vary)
			gotGroupByColumns := sortColumnInfo(result.GroupByColumns)
			wantGroupByColumns := sortColumnInfo(tt.wantGroupByColumns)

			if !reflect.DeepEqual(gotGroupByColumns, wantGroupByColumns) {
				t.Errorf("Extract() GroupByColumns = %v, want %v", gotGroupByColumns, wantGroupByColumns)
			}
		})
	}
}
