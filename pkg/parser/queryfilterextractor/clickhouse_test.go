package queryfilterextractor

import (
	"reflect"
	"sort"
	"testing"
)

func TestClickHouseFilterExtractor_GroupByColumns(t *testing.T) {
	extractor := NewClickHouseFilterExtractor()

	tests := []struct {
		name               string
		query              string
		wantMetrics        []string
		wantGroupByColumns []ColumnInfo
		wantError          bool
	}{
		{
			name:        "CH64 - Only select query get's extracted and parsed",
			query:       `SELECT avg(value) FROM metrics WHERE 'cpu' = metric_name GROUP BY region;CREATE DATABASE mydb; DELETE FROM metrics WHERE metric_name = 'memory';`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias1 - Simple alias",
			query:       `SELECT region as new_region FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "new_region", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias2 - No alias",
			query:       `SELECT region FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias3 - Mixed aliases",
			query:       `SELECT region as r, zone FROM metrics WHERE metric_name='cpu' GROUP BY region, zone`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
				{Name: "zone", Alias: "", OriginExpr: "zone", OriginField: "zone"},
			},
		},
		{
			name:        "Alias4 - GROUP BY not in SELECT",
			query:       `SELECT sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias5 - Duplicate column with different aliases (last wins)",
			query:       `SELECT region as r1, region as r2 FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r2", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias6 - Function expression with alias",
			query:       `SELECT toDate(timestamp) as day FROM metrics WHERE metric_name='cpu' GROUP BY toDate(timestamp)`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				// ignore time related functions from origin field
				{Name: "toDate(timestamp)", Alias: "day", OriginExpr: "toDate(timestamp)", OriginField: ""},
			},
		},
		{
			name:        "Alias7 - Table alias in SELECT",
			query:       `SELECT m.region as r FROM metrics m WHERE metric_name='cpu' GROUP BY m.region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias8 - Multiple GROUP BY columns with mixed aliases",
			query:       `SELECT region as r, zone as z, toDate(timestamp) as day FROM metrics WHERE metric_name='cpu' GROUP BY region, zone, toDate(timestamp)`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
				{Name: "zone", Alias: "z", OriginExpr: "zone", OriginField: "zone"},
				{Name: "toDate(timestamp)", Alias: "day", OriginExpr: "toDate(timestamp)", OriginField: ""},
			},
		},
		{
			name:        "Alias9 - CTE with GROUP BY and alias",
			query:       `WITH cte AS (SELECT region as r FROM metrics WHERE metric_name='cpu' GROUP BY region) SELECT r FROM cte`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias10 - Subquery with GROUP BY and alias",
			query:       `SELECT r FROM (SELECT region as r FROM metrics WHERE metric_name='cpu' GROUP BY region)`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "Alias11 - Multiple columns, some with GROUP BY",
			query:       `SELECT region as r, zone, sum(value) as total FROM metrics WHERE metric_name='cpu' GROUP BY region, zone`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "r", OriginExpr: "region", OriginField: "region"},
				{Name: "zone", Alias: "", OriginExpr: "zone", OriginField: "zone"},
			},
		},
		{
			name:        "Alias12 - Backtick column with alias",
			query:       "SELECT `os.type` as os_type FROM metrics WHERE metric_name='cpu' GROUP BY `os.type`",
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "os.type", Alias: "os_type", OriginExpr: "`os.type`", OriginField: "os.type"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.query)

			if err != nil {
				if tt.wantError {
					return
				}
				t.Errorf("Extract() error = %v, wantError %v, query %s", err, tt.wantError, tt.query)
				return
			}

			// Sort for comparison
			gotMetrics := sortStrings(result.MetricNames)
			wantMetrics := sortStrings(tt.wantMetrics)

			if !reflect.DeepEqual(gotMetrics, wantMetrics) {
				t.Errorf("Extract() MetricNames = %#v, want %#v, query %s", gotMetrics, wantMetrics, tt.query)
			}

			// Test GroupByColumns - need to normalize for comparison (order may vary)
			if tt.wantGroupByColumns != nil {
				gotGroupByColumns := sortColumnInfo(result.GroupByColumns)
				wantGroupByColumns := sortColumnInfo(tt.wantGroupByColumns)

				if !reflect.DeepEqual(gotGroupByColumns, wantGroupByColumns) {
					t.Errorf("Extract() GroupByColumns = %#v, want %#v, query %s", gotGroupByColumns, wantGroupByColumns, tt.query)
				}
			}
		})
	}
}

func TestClickHouseFilterExtractor_SimpleCHQueries(t *testing.T) {
	extractor := NewClickHouseFilterExtractor()

	tests := []struct {
		name               string
		query              string
		wantMetrics        []string
		wantGroupByColumns []ColumnInfo
		wantError          bool
	}{
		{
			name:               "CH1 - Simple WHERE",
			query:              `SELECT * FROM metrics WHERE metric_name = 'cpu_usage'`,
			wantMetrics:        []string{"cpu_usage"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH2 - Multiple IN",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem','disk')`,
			wantMetrics:        []string{"cpu", "mem", "disk"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH3 - Negative filter",
			query:              `SELECT * FROM metrics WHERE metric_name != 'cpu_usage'`,
			wantMetrics:        []string{}, // Negative filters don't extract per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH4 - Negative multi filter",
			query:              `SELECT * FROM metrics WHERE metric_name NOT IN ('foo','bar')`,
			wantMetrics:        []string{}, // Negative filters don't extract per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH5 - Aggregation",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "CH6 - With extra filters",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' AND region='us' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH7 - Multiple OR",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' OR metric_name='mem'`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH8 - Mixed positive & negative",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND metric_name NOT IN ('mem')`,
			wantMetrics:        []string{"cpu", "mem"}, // Positive filters extracted, negative ignored
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH9 - Multi-group",
			query:       `SELECT region as new_region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region,zone`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "new_region", OriginExpr: "region", OriginField: "region"},
				{Name: "zone", Alias: "", OriginExpr: "zone", OriginField: "zone"},
			},
		},
		{
			name:        "CH10 - Expr in group",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region, toDate(timestamp)`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
				{Name: "toDate(timestamp)", Alias: "", OriginExpr: "toDate(timestamp)", OriginField: ""},
			},
		},
		{
			name:               "CH11 - Pattern filter",
			query:              `SELECT * FROM metrics WHERE metric_name LIKE 'cpu_%'`,
			wantMetrics:        []string{}, // Pattern filters don't extract per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH12 - Pattern exclusion",
			query:              `SELECT * FROM metrics WHERE metric_name NOT LIKE 'cpu_%'`,
			wantMetrics:        []string{}, // Pattern filters don't extract per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH13 - Nested subquery",
			query:              `SELECT avg(value) FROM (SELECT * FROM metrics WHERE metric_name='cpu')`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH14 - Nested subquery with IN",
			query:       `SELECT region as new_region, avg(value) FROM (SELECT * FROM metrics WHERE metric_name IN ('cpu','mem')) GROUP BY region`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "new_region", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH15 - CTE",
			query:              `WITH t AS (SELECT * FROM metrics WHERE metric_name='cpu') SELECT * FROM t`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH16 - CTE + outer filter",
			query:              `WITH t AS (SELECT * FROM metrics WHERE metric_name='cpu') SELECT * FROM t WHERE metric_name='mem'`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH17 - JOIN",
			query:              `SELECT * FROM metrics m JOIN regions r ON m.region_id=r.id WHERE m.metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH18 - JOIN using metric_name",
			query:              `SELECT * FROM metrics m JOIN regions r ON m.metric_name=r.metric_name WHERE m.metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH19 - Subquery data-driven",
			query:              `SELECT * FROM metrics WHERE metric_name IN (SELECT metric_name FROM metadata WHERE active=1)`,
			wantMetrics:        []string{}, // Subqueries in IN are ignored per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH20 - Derived metric",
			query:              `SELECT * FROM metrics WHERE metric_name = concat('cpu','_usage')`,
			wantMetrics:        []string{}, // Non-literal expressions ignored per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH21 - No metric filter",
			query:              `SELECT * FROM metrics WHERE timestamp > now() - INTERVAL 1 HOUR`,
			wantMetrics:        []string{},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH22 - Compound logic",
			query:              `SELECT * FROM metrics WHERE (metric_name='cpu' AND region='us') OR (metric_name='mem' AND region='eu')`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH23 - UNION query",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' UNION ALL SELECT * FROM metrics WHERE metric_name='mem'`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH24 - Contradiction",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' AND metric_name!='cpu'`,
			wantMetrics:        []string{"cpu"}, // Positive filter extracted
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH25 - Mixed inclusion/exclusion logic",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') OR metric_name NOT IN ('net')`,
			wantMetrics:        []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH26 - HAVING clause",
			query:       `SELECT region, count() FROM metrics WHERE metric_name='cpu' GROUP BY region HAVING region!='us'`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH27 - Multi-statement",
			query:              `SELECT * FROM metrics; SELECT * FROM metrics WHERE metric_name='mem';`,
			wantMetrics:        []string{"mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH28 - ORDER BY",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region, team ORDER BY avg(value)`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
				{Name: "team", Alias: "", OriginExpr: "team", OriginField: "team"},
			},
		},
		{
			name:               "CH29 - SETTINGS clause",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' SETTINGS max_threads=8`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH30 - Invalid syntax",
			query:              `SELECT FROM metrics WHERE`,
			wantMetrics:        []string{},
			wantGroupByColumns: []ColumnInfo{},
			wantError:          true,
		},
		{
			name:        "CH31 - Aliased table reference",
			query:       `SELECT m.region, avg(m.value) FROM metrics AS m WHERE m.metric_name='cpu' GROUP BY m.region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH32 - Nested subquery referencing alias",
			query:              `SELECT * FROM (SELECT * FROM metrics WHERE metric_name='cpu') AS sub WHERE sub.metric_name='mem'`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH33 - WITH TOTALS clause",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name IN ('cpu','mem') AND region IN ('us','eu') GROUP BY region WITH TOTALS`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "CH34 - FORMAT clause",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region FORMAT JSON`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "CH35 - PREWHERE clause",
			query:       `SELECT region, avg(value) FROM metrics PREWHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH36 - SAMPLE clause",
			query:              `SELECT region, avg(value) FROM metrics SAMPLE 0.1 WHERE metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH37 - Self-group on metric_name",
			query:       `SELECT metric_name as cpu_metric, count() FROM metrics WHERE metric_name='cpu' GROUP BY metric_name,region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "metric_name", Alias: "cpu_metric", OriginExpr: "metric_name", OriginField: "metric_name"},
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH38 - ANY() array literal form",
			query:              `SELECT avg(value) FROM metrics WHERE metric_name = any(['cpu','mem'])`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH39 - ARRAY JOIN",
			query:              `SELECT * FROM metrics ARRAY JOIN tags AS tag WHERE metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH40 - Conditional aggregate",
			query:       `SELECT region, sumIf(value, metric_name='cpu') FROM metrics GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "CH41 - Conditional aggregate multi",
			query:       `SELECT region, sumIf(value, metric_name IN ('cpu','mem')) FROM metrics GROUP BY region`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH42 - GLOBAL IN operator",
			query:              `SELECT avg(value) FROM metrics WHERE metric_name GLOBAL IN ('cpu','mem')`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH43 - FINAL modifier",
			query:              `SELECT * FROM metrics FINAL WHERE metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH44 - SETTINGS clause",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region SETTINGS allow_experimental_parallel_reading=1`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH45 - LIMIT BY clause",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') LIMIT 100 BY region`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH46 - WINDOW function",
			query:              `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' WINDOW w AS (PARTITION BY region ORDER BY timestamp)`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH47 - Window function inline",
			query:              `SELECT region, avg(value) OVER (PARTITION BY region) FROM metrics WHERE metric_name='cpu'`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH48 - CASE expression",
			query:              `SELECT CASE WHEN metric_name='cpu' THEN value*2 ELSE value END FROM metrics`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH49 - Subquery referencing same table",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' AND value > (SELECT avg(value) FROM metrics WHERE metric_name='cpu')`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH50 - EXISTS subquery",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND EXISTS (SELECT 1 FROM metrics WHERE metric_name='disk')`,
			wantMetrics:        []string{"cpu", "mem", "disk"},
			wantGroupByColumns: []ColumnInfo{},
			wantError:          false, // Parser may fail on EXISTS with SELECT 1, but we'll try
		},
		{
			name:               "CH51 - Subquery on non-metric table",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' AND region IN (SELECT region FROM regions WHERE active=1)`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH52 - HAVING aggregate",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region HAVING count() > 10`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH53 - Combined IN + NOT LIKE",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND metric_name NOT LIKE 'disk%'`,
			wantMetrics:        []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH54 - GROUP BY WITH ROLLUP",
			query:       `SELECT metric_name FROM metrics WHERE metric_name IN ('cpu','mem') GROUP BY metric_name WITH ROLLUP`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "metric_name", Alias: "", OriginExpr: "metric_name", OriginField: "metric_name"},
			},
		},
		{
			name:        "CH55 - GROUP BY WITH CUBE",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region WITH CUBE`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH56 - Nested logic in parentheses",
			query:              `SELECT * FROM metrics WHERE metric_name='cpu' AND (value > 90 OR (metric_name='mem' AND region='us'))`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH57 - ORDER + LIMIT + OFFSET",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name IN ('cpu','mem') GROUP BY region ORDER BY region DESC LIMIT 10 OFFSET 5`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:               "CH58 - SETTINGS inside query",
			query:              `SELECT * FROM metrics WHERE metric_name IN ('cpu') SETTINGS optimize_move_to_prewhere=0`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH59 - Function around literal",
			query:              `SELECT * FROM metrics WHERE metric_name in lowercase('cpu')`,
			wantMetrics:        []string{}, // Function-wrapped literal treated as non-literal per spec
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH60 - Mixed positive & negative",
			query:              `SELECT * FROM metrics WHERE metric_name = 'cpu' OR (metric_name = 'mem' AND metric_name != 'disk')`,
			wantMetrics:        []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH61 - metric_name on right side (equality)",
			query:              `SELECT * FROM metrics WHERE 'cpu' = metric_name`,
			wantMetrics:        []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:               "CH62 - metric_name on right side (complex OR)",
			query:              `SELECT * FROM metrics WHERE ('cpu' = metric_name OR 'mem' = metric_name) AND region = 'us'`,
			wantMetrics:        []string{"cpu", "mem"},
			wantGroupByColumns: []ColumnInfo{},
		},
		{
			name:        "CH63 - metric_name on right side with GROUP BY",
			query:       `SELECT avg(value) FROM metrics WHERE 'cpu' = metric_name GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name:        "CH64 - Only select query get's extracted and parsed",
			query:       `SELECT avg(value) FROM metrics WHERE 'cpu' = metric_name GROUP BY region;CREATE DATABASE mydb; DELETE FROM metrics WHERE metric_name = 'memory';`,
			wantMetrics: []string{"cpu"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.query)

			if err != nil {
				if tt.wantError {
					return
				}
				t.Errorf("Extract() error = %v, wantError %v, query %s", err, tt.wantError, tt.query)
				return
			}

			// Sort for comparison
			gotMetrics := sortStrings(result.MetricNames)
			wantMetrics := sortStrings(tt.wantMetrics)

			if !reflect.DeepEqual(gotMetrics, wantMetrics) {
				t.Errorf("Extract() MetricNames = %#v, want %#v, query %s", gotMetrics, wantMetrics, tt.query)
			}

			// Test GroupByColumns - need to normalize for comparison (order may vary)
			gotGroupByColumns := sortColumnInfo(result.GroupByColumns)
			wantGroupByColumns := sortColumnInfo(tt.wantGroupByColumns)

			if !reflect.DeepEqual(gotGroupByColumns, wantGroupByColumns) {
				t.Errorf("Extract() GroupByColumns = %#v, want %#v, query %s", gotGroupByColumns, wantGroupByColumns, tt.query)
			}
		})
	}
}

func TestClickHouseFilterExtractor_SimpleCTEGroupByQueries(t *testing.T) {
	extractor := NewClickHouseFilterExtractor()

	tests := []struct {
		name               string
		query              string
		wantMetrics        []string
		wantGroupByColumns []ColumnInfo
		wantError          bool
	}{
		{
			name:        "Basic test - no CTE",
			query:       `SELECT * FROM metrics WHERE metric_name = 'cpu_usage' GROUP BY region`,
			wantMetrics: []string{"cpu_usage"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name: "Simple CTE with GROUP BY",
			query: `WITH aggregated AS (
				SELECT region as region_alias, sum(value) AS total
				FROM metrics
				WHERE metric_name = 'cpu_usage'
				GROUP BY region
			)
			SELECT * FROM aggregated`,
			wantMetrics: []string{"cpu_usage"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "region_alias", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name: "CTE chain - should return last GROUP BY",
			query: `WITH step1 AS (
				SELECT service as service_alias, timestamp as ts, value
				FROM metrics
				WHERE metric_name = 'requests'
				GROUP BY service, timestamp
			),
			step2 AS (
				SELECT ts, avg(value) AS avg_value
				FROM step1
				GROUP BY ts
			)
			SELECT * FROM step2`,
			wantMetrics: []string{"requests"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "timestamp", OriginField: "timestamp"},
			},
		},
		{
			name: "Outer GROUP BY overrides CTE GROUP BY",
			query: `WITH cte AS (
				SELECT region, service, value
				FROM metrics
				WHERE metric_name = 'memory'
				GROUP BY region, service
			)
			SELECT region as region_alias, sum(value) as total
			FROM cte
			GROUP BY region`,
			wantMetrics: []string{"memory"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "region_alias", OriginExpr: "region", OriginField: "region"},
			},
		},
		{
			name: "Nested subquery with different origin",
			query: `SELECT ts, value
			FROM (
				SELECT le, ts, sum(per_series_value) AS value
				FROM (
					SELECT le, timestamp as ts, value AS per_series_value
					FROM metrics
					WHERE metric_name = 'histogram'
					GROUP BY le, timestamp, value
				)
				GROUP BY le, ts
			)
			GROUP BY ts`,
			wantMetrics: []string{"histogram"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "timestamp", OriginField: "timestamp"},
			},
		},
		{
			name: "CTE without GROUP BY - should extract from outer",
			query: `WITH cte AS (
				SELECT r as region, service, value
				FROM metrics
				WHERE metric_name = 'disk'
			)
			SELECT region, sum(value)
			FROM cte
			GROUP BY region`,
			wantMetrics: []string{"disk"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "region", Alias: "", OriginExpr: "r", OriginField: "r"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.query)

			if (err != nil) != tt.wantError {
				t.Errorf("Extract() error = %v, wantError %v", err, tt.wantError)
				return
			}

			if err != nil {
				return
			}

			// Sort results for consistent comparison
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

func TestClickHouseFilterExtractor_NestedComplexCTEGroupByQueries(t *testing.T) {
	extractor := NewClickHouseFilterExtractor()

	tests := []struct {
		name               string
		query              string
		wantMetrics        []string
		wantGroupByColumns []ColumnInfo
		wantError          bool
	}{
		{
			name: "TC1 - CTE with GROUP BY, outer SELECT without GROUP BY",
			query: `
		WITH __spatial_aggregation_cte AS    (
		        SELECT
		        toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60)) AS ts,
		            service,
		            op,
		            sum(value) / 60 AS value
		            FROM signoz_metrics.distributed_samples_v4 AS points
		        INNER JOIN   (
		            SELECT
		            fingerprint,
		                JSONExtractString(labels, 'service.name') AS service,
		                JSONExtractString(labels, 'operation') AS op
		            FROM signoz_metrics.time_series_v4
		            WHERE (metric_name IN ('app_requests_total')) AND (unix_milli >= 1731340800000) AND (unix_milli <= 1731344400000) AND (LOWER(temporality) LIKE LOWER('delta')) AND (__normalized = false)
		            GROUP BY
		            fingerprint,
		                service,
		                op
		        ) AS filtered_time_series
		        ON points.fingerprint = filtered_time_series.fingerprint
		        WHERE (metric_name IN ('app_requests_total')) AND (unix_milli >= 1731340800000) AND (unix_milli < 1731344400000)
		        GROUP BY
		        ts,
		            service,
		            op
		    )
		SELECT ts, service, value FROM __spatial_aggregation_cte
					`,
			wantMetrics: []string{"app_requests_total"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60))", OriginField: ""},
				{Name: "service", Alias: "", OriginExpr: "JSONExtractString(labels, 'service.name')", OriginField: "service.name"},
				{Name: "op", Alias: "", OriginExpr: "JSONExtractString(labels, 'operation')", OriginField: "operation"},
			},
		},
		{
			name: "TC2 - CTE chain with multiple CTEs",
			query: `
				WITH    __temporal_aggregation_cte AS    (
				        SELECT
				        fingerprint,
				            toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60)) AS ts,
				            avg(value) AS per_series_value
				        FROM signoz_metrics.distributed_samples_v4 AS points
				        INNER JOIN        (
				            SELECT fingerprint
				            FROM signoz_metrics.time_series_v4
				            WHERE (metric_name IN ('node.cpu.usage')) AND (unix_milli >= 1731427200000) AND (unix_milli <= 1731430800000) AND (LOWER(temporality) LIKE LOWER('cumulative')) AND (__normalized = false)
				            GROUP BY fingerprint
				        ) AS filtered_time_series
				        ON points.fingerprint = filtered_time_series.fingerprint
				        WHERE (metric_name IN ('node.cpu.usage')) AND (unix_milli >= 1731427200000) AND (unix_milli < 1731430800000)
				        GROUP BY
				        fingerprint,
				            ts
				        ORDER BY
				        fingerprint ASC,
				            ts ASC
				            ),
				    __spatial_aggregation_cte AS    (
				        SELECT
				        ts,
				            avg(per_series_value) AS value
				            FROM __temporal_aggregation_cte
				        WHERE isNaN(per_series_value) = 0
				        GROUP BY ts
				    )
				SELECT * FROM __spatial_aggregation_cte;
							`,
			wantMetrics: []string{"node.cpu.usage"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60))", OriginField: ""},
			},
		},
		{
			name: "TC3 - Outer GROUP BY overrides CTE GROUP BY",
			query: `
				WITH __spatial_aggregation_cte AS (
				    SELECT
				        toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60)) AS ts,
				        svc,
				        le,
				        sum(value)/60 AS value
				        FROM signoz_metrics.distributed_samples_v4 AS points
				    INNER JOIN (
				        SELECT
				            fingerprint,
				            JSONExtractString(labels, 'service.name') AS svc,
				            JSONExtractString(labels, 'le') AS le
				        FROM signoz_metrics.time_series_v4
				        WHERE
				            metric_name IN ('http_request_duration.bucket')
				            AND unix_milli >= 1731513600000
				            AND unix_milli <= 1731518880000
				            AND LOWER(temporality) LIKE LOWER('delta')
				            AND __normalized = false
				            GROUP BY
				            fingerprint,
				            svc,
				            le
				    ) AS filtered_time_series
				    ON points.fingerprint = filtered_time_series.fingerprint
				    WHERE
				        metric_name IN ('http_request_duration.bucket')
				        AND unix_milli >= 1731517140000
				        AND unix_milli < 1731518880000
				        GROUP BY
				        ts,
				        svc,
				        le
				)
				SELECT
				    ts,
				    svc,
				    histogramQuantile(
				        arrayMap(x -> toFloat64(x), groupArray(le)),
				        groupArray(value),
				        0.900    ) AS value
				        FROM __spatial_aggregation_cte
				GROUP BY
				    svc,
				    ts
							`,
			wantMetrics: []string{"http_request_duration.bucket"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "svc", Alias: "", OriginExpr: "JSONExtractString(labels, 'service.name')", OriginField: "service.name"},
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60))", OriginField: ""},
			},
		},
		{
			name: "TC4 - Nested subquery with outer GROUP BY override",
			query: `
		SELECT
		    ts,
		    histogramQuantile(
		        arrayMap(x -> toFloat64(x), groupArray(le)),
		        groupArray(value),
		        0.990    ) AS value
		    FROM (
		    SELECT
		        le,
		        ts,
		        sum(per_series_value) AS value    FROM (
		        SELECT
		            le,
		            ts,
		            If(
		                (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0,
		                nan,
		                If(
		                    (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400,
		                    nan,
		                    (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) /
		                    (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)
		                )
		            ) AS per_series_value
		        FROM (
		            SELECT
		                fingerprint,
		                any(le) AS le,
		                toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) AS ts,
		                max(value) AS per_series_value
		            FROM signoz_metrics.distributed_samples_v4
		            INNER JOIN (
		                SELECT DISTINCT
		                    JSONExtractString(labels, 'le') AS le,
		                    fingerprint
		                FROM signoz_metrics.time_series_v4_1day
		                WHERE
		                    metric_name IN ['signoz_latency_bucket']
		                    AND temporality = 'Cumulative'                    AND __normalized = false                    AND unix_milli >= 1650931200000                    AND unix_milli < 1651078380000                    AND like(JSONExtractString(labels, 'service_name'), '%frontend%')
		            ) AS filtered_time_series
		            USING fingerprint
		            WHERE
		                metric_name IN ['signoz_latency_bucket']
		                AND unix_milli >= 1650991980000                AND unix_milli < 1651078380000                AND bitAnd(flags, 1) = 0            GROUP BY
		                fingerprint,
		                ts
		            ORDER BY
		                fingerprint,
		                ts
		        )
		        WINDOW rate_window AS (
		            PARTITION BY fingerprint
		            ORDER BY fingerprint, ts
		        )
		    )
		    WHERE isNaN(per_series_value) = 0
		    GROUP BY
		        le,
		        ts
		    ORDER BY
		        le ASC,
		        ts ASC)
		GROUP BY ts
		ORDER BY ts ASC
					`,
			wantMetrics: []string{"signoz_latency_bucket"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND)", OriginField: ""},
			},
		},
		{
			name: "TC5 - Multiple CTEs with outer GROUP BY",
			query: `
		WITH  toUInt64(1650991980000) AS start_ms,
		  toUInt64(1651078380000)   AS end_ms,
		  toUInt64(60) AS bucket_s
		  , job_last AS (
		  SELECT    toStartOfInterval(
		      toDateTime(intDiv(s.unix_milli,1000)),
		      toIntervalSecond(bucket_s)
		    ) AS ts,
		    JSONExtractString(tsv.labels,'k8s.job.name') AS job,
		    maxIf(s.value, s.metric_name='k8s.job.failed_pods')             AS failed,
		    maxIf(s.value, s.metric_name='k8s.job.successful_pods')         AS success,
		    maxIf(s.value, s.metric_name='k8s.job.desired_successful_pods') AS desired
		  FROM signoz_metrics.distributed_samples_v4 AS s
		  JOIN signoz_metrics.time_series_v4_1day AS tsv
		    ON s.fingerprint = tsv.fingerprint
		  WHERE s.metric_name IN (
		          'k8s.job.failed_pods',
		          'k8s.job.successful_pods',
		          'k8s.job.desired_successful_pods'        )
		    AND s.unix_milli >= start_ms AND s.unix_milli < end_ms
		  GROUP BY ts, job
		)
		, flags AS (
		  SELECT
		  ts,
		    job,
		    failed,
		    success,
		    desired,
		    (success = desired AND desired > 0) AS complete_now
		  FROM job_last
		), deltas AS (
		  SELECT    curr.ts,
		    curr.job,
		    greatest(curr.failed  - ifNull(prev.failed,  0), 0) AS d_failed,
		    greatest(curr.success - ifNull(prev.success, 0), 0) AS d_success,
		    greatest(curr.desired - ifNull(prev.desired, 0), 0) AS d_desired
		  FROM flags AS curr
		  LEFT JOIN flags AS prev
		    ON curr.job = prev.job
		   AND prev.ts  = curr.ts - toIntervalSecond(bucket_s)
		), job_first_success AS (
		  SELECT job, min(ts) AS first_success_ts
		  FROM flags
		  WHERE complete_now
		  GROUP BY job
		)
		SELECT  d.ts,
		  sum(
		    multiIf(
		      greatest(d_failed + d_success - d_desired, 0) > 0      AND (
		        js.first_success_ts IS NULL
		        OR js.first_success_ts < d.ts
		        ),
		      greatest(d_failed + d_success - d_desired, 0),
		      0    )
		  ) AS value FROM deltas AS d
		LEFT JOIN job_first_success AS js
		  ON d.job = js.job
		GROUP BY d.ts
		ORDER BY d.ts;
					`,
			wantMetrics: []string{"k8s.job.failed_pods", "k8s.job.successful_pods", "k8s.job.desired_successful_pods"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(s.unix_milli, 1000)), toIntervalSecond(bucket_s))", OriginField: ""},
			},
		},
		{
			name: "TC6 - Outer GROUP BY with ClickHouse dialect (backticks)",
			query: `
		SELECT
		    ` + "`os.type`" + `,
		    state,
		    ` + "`host_name`" + `,
		    ts,
		    max(per_series_value) AS value FROM (
		    SELECT
		        fingerprint,
		        any(` + "`os.type`" + `) AS ` + "`os.type`" + `,
		        any(state) AS state,
		        any(` + "`host_name`" + `) AS ` + "`host_name`" + `,
		        toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) AS ts,
		        max(value) AS per_series_value
		    FROM signoz_metrics.distributed_samples_v4
		    INNER JOIN (
		        SELECT DISTINCT
		            JSONExtractString(labels, 'os.type') AS ` + "`os.type`" + `,
		            JSONExtractString(labels, 'state') AS state,
		            JSONExtractString(labels, 'host_name') AS ` + "`host_name`" + `,
		            fingerprint
		        FROM signoz_metrics.time_series_v4_1day
		        WHERE
		            metric_name IN ['system.memory.usage']
		            AND temporality = 'Unspecified'            AND __normalized = false            AND unix_milli >= 1650931200000            AND unix_milli < 1651078380000            AND JSONExtractString(labels, 'host.name') = 'signoz-host'    ) AS filtered_time_series
		    USING fingerprint
		    WHERE
		        metric_name IN ['system.memory.usage']
		        AND unix_milli >= 1650991980000        AND unix_milli < 1651078380000        AND bitAnd(flags, 1) = 0    GROUP BY
		        fingerprint,
		        ts
		    ORDER BY
		        fingerprint,
		        ts
		)
		WHERE isNaN(per_series_value) = 0
		GROUP BY
		    ` + "`os.type`" + `,
		    state,
		    ` + "`host_name`" + `,
		    ts
		ORDER BY
		    ` + "`os.type`" + ` DESC,
		    state ASC,
		    ` + "`host_name`" + ` ASC,
		    ts ASC
					`,
			wantMetrics: []string{"system.memory.usage"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "os.type", Alias: "", OriginExpr: "JSONExtractString(labels, 'os.type')", OriginField: "os.type"},
				{Name: "state", Alias: "", OriginExpr: "JSONExtractString(labels, 'state')", OriginField: "state"},
				{Name: "host_name", Alias: "", OriginExpr: "JSONExtractString(labels, 'host_name')", OriginField: "host_name"},
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND)", OriginField: ""},
			},
		},
		{
			name: "TC7 - Multiple CTEs with final outer GROUP BY",
			query: `
		WITH  toUInt64(1650991980000) AS start_ms,
		  toUInt64(1651078380000)   AS end_ms,
		  toUInt64(60) AS bucket_s , job_last AS (
		  SELECT    toStartOfInterval(toDateTime(intDiv(s.unix_milli, 1000)), toIntervalSecond(bucket_s)) AS ts,
		    JSONExtractString(tsv.labels, 'k8s.job.name') AS job,
		    maxIf(s.value, s.metric_name = 'k8s.job.successful_pods')         AS max_success,
		    maxIf(s.value, s.metric_name = 'k8s.job.desired_successful_pods') AS max_desired
		  FROM signoz_metrics.distributed_samples_v4 AS s
		  JOIN signoz_metrics.time_series_v4_1day AS tsv
		    ON s.fingerprint = tsv.fingerprint
		  WHERE s.metric_name IN ('k8s.job.successful_pods', 'k8s.job.desired_successful_pods')
		    AND s.unix_milli >= start_ms AND s.unix_milli < end_ms
		  GROUP BY ts, job
		)
		, flags AS (
		  SELECT    ts,
		    job,
		    (max_success = max_desired AND max_desired > 0) AS complete_now
		  FROM job_last
		)
		SELECT  curr.ts,
		  sum(
		    multiIf(
		      curr.complete_now = 1      AND (prev.complete_now = 0 OR prev.complete_now IS NULL),
		      1, 0
		      )
		  ) AS value FROM flags AS curr
		LEFT JOIN flags AS prev
		  ON curr.job = prev.job
		  AND prev.ts = curr.ts - toIntervalSecond(bucket_s)
		GROUP BY curr.ts
		ORDER BY curr.ts;
					`,
			wantMetrics: []string{"k8s.job.successful_pods", "k8s.job.desired_successful_pods"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(s.unix_milli, 1000)), toIntervalSecond(bucket_s))", OriginField: ""},
			},
		},

		{
			name: "TC8 - Nested subquery with outer GROUP BY and multi level change in column value",
			query: `
		SELECT
		    ts,
		    histogramQuantile(
		        arrayMap(x -> toFloat64(x), groupArray(le)),
		        groupArray(value),
		        0.990    ) AS value
		    FROM (
		    SELECT
		        le,
		        ts,
		        sum(per_series_value) AS value    FROM (
		        SELECT
		            le,
		            ts,
		            If(
		                (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0,
		                nan,
		                If(
		                    (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400,
		                    nan,
		                    (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) /
		                    (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)
		                )
		            ) AS per_series_value
		        FROM (
		            SELECT
		                fingerprint,
		                any(le) AS le,
		                toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) AS ts,
		                max(value) AS per_series_value
		            FROM signoz_metrics.distributed_samples_v4
		            INNER JOIN (
		                SELECT DISTINCT
		                    JSONExtractString(labels, 'le') AS le,
		                    fingerprint
		                FROM signoz_metrics.time_series_v4_1day
		                WHERE
		                    metric_name IN ['signoz_latency_bucket']
		                    AND temporality = 'Cumulative'                    AND __normalized = false                    AND unix_milli >= 1650931200000                    AND unix_milli < 1651078380000                    AND like(JSONExtractString(labels, 'service_name'), '%frontend%')
		            ) AS filtered_time_series
		            USING fingerprint
		            WHERE
		                metric_name IN ['signoz_latency_bucket']
		                AND unix_milli >= 1650991980000                AND unix_milli < 1651078380000                AND bitAnd(flags, 1) = 0            GROUP BY
		                fingerprint,
		                ts
		            ORDER BY
		                fingerprint,
		                ts
		        )
		        WINDOW rate_window AS (
		            PARTITION BY fingerprint
		            ORDER BY fingerprint, ts
		        )
		    )
		    WHERE isNaN(per_series_value) = 0
		    GROUP BY
		        le,
		        ts
		    ORDER BY
		        le ASC,
		        ts ASC)
					`,
			wantMetrics: []string{"signoz_latency_bucket"},
			wantGroupByColumns: []ColumnInfo{
				{Name: "ts", Alias: "", OriginExpr: "toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND)", OriginField: ""},
				{Name: "le", Alias: "", OriginExpr: "JSONExtractString(labels, 'le')", OriginField: "le"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.query)

			if err != nil {
				if tt.wantError {
					return
				}
				t.Errorf("Extract() error = %v, wantError %v", err, tt.wantError)
				return
			}

			// Sort for comparison
			gotMetrics := sortStrings(result.MetricNames)
			wantMetrics := sortStrings(tt.wantMetrics)

			if !reflect.DeepEqual(gotMetrics, wantMetrics) {
				t.Errorf("Extract() MetricNames = %#v, want %#v", gotMetrics, wantMetrics)
			}

			// Test GroupByColumns - need to normalize for comparison (order may vary)
			gotGroupByColumns := sortColumnInfo(result.GroupByColumns)
			wantGroupByColumns := sortColumnInfo(tt.wantGroupByColumns)

			if !reflect.DeepEqual(gotGroupByColumns, wantGroupByColumns) {
				t.Errorf("Extract() GroupByColumns = %#v, want %#v", gotGroupByColumns, wantGroupByColumns)
			}
		})
	}
}

func sortStrings(s []string) []string {
	sorted := make([]string, len(s))
	copy(sorted, s)
	sort.Strings(sorted)
	return sorted
}

func sortColumnInfo(columns []ColumnInfo) []ColumnInfo {
	sorted := make([]ColumnInfo, len(columns))
	copy(sorted, columns)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Name != sorted[j].Name {
			return sorted[i].Name < sorted[j].Name
		}
		return sorted[i].Alias < sorted[j].Alias
	})
	return sorted
}
