package queryfilterextractor

import (
	"reflect"
	"sort"
	"testing"
)

func TestClickHouseFilterExtractor_Extract(t *testing.T) {
	extractor := NewClickHouseFilterExtractor()

	tests := []struct {
		name        string
		query       string
		wantMetrics []string
		wantGroupBy []string
		wantError   bool
	}{
		{
			name:        "CH1 - Simple WHERE",
			query:       `SELECT * FROM metrics WHERE metric_name = 'cpu_usage'`,
			wantMetrics: []string{"cpu_usage"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH2 - Multiple IN",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem','disk')`,
			wantMetrics: []string{"cpu", "mem", "disk"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH3 - Negative filter",
			query:       `SELECT * FROM metrics WHERE metric_name != 'cpu_usage'`,
			wantMetrics: []string{}, // Negative filters don't extract per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH4 - Negative multi filter",
			query:       `SELECT * FROM metrics WHERE metric_name NOT IN ('foo','bar')`,
			wantMetrics: []string{}, // Negative filters don't extract per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH5 - Aggregation",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH6 - With extra filters",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' AND region='us' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH7 - Multiple OR",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' OR metric_name='mem'`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH8 - Mixed positive & negative",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND metric_name NOT IN ('mem')`,
			wantMetrics: []string{"cpu", "mem"}, // Positive filters extracted, negative ignored
			wantGroupBy: []string{},
		},
		{
			name:        "CH9 - Multi-group",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region,zone`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region", "zone"},
		},
		{
			name:        "CH10 - Expr in group",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region, toDate(timestamp)`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region", "toDate(timestamp)"},
		},
		{
			name:        "CH11 - Pattern filter",
			query:       `SELECT * FROM metrics WHERE metric_name LIKE 'cpu_%'`,
			wantMetrics: []string{}, // Pattern filters don't extract per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH12 - Pattern exclusion",
			query:       `SELECT * FROM metrics WHERE metric_name NOT LIKE 'cpu_%'`,
			wantMetrics: []string{}, // Pattern filters don't extract per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH13 - Nested subquery",
			query:       `SELECT avg(value) FROM (SELECT * FROM metrics WHERE metric_name='cpu')`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH14 - Nested subquery with IN",
			query:       `SELECT avg(value) FROM (SELECT * FROM metrics WHERE metric_name IN ('cpu','mem')) GROUP BY region`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH15 - CTE",
			query:       `WITH t AS (SELECT * FROM metrics WHERE metric_name='cpu') SELECT * FROM t`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH16 - CTE + outer filter",
			query:       `WITH t AS (SELECT * FROM metrics WHERE metric_name='cpu') SELECT * FROM t WHERE metric_name='mem'`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH17 - JOIN",
			query:       `SELECT * FROM metrics m JOIN regions r ON m.region_id=r.id WHERE m.metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH18 - JOIN using metric_name",
			query:       `SELECT * FROM metrics m JOIN regions r ON m.metric_name=r.metric_name WHERE m.metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH19 - Subquery data-driven",
			query:       `SELECT * FROM metrics WHERE metric_name IN (SELECT metric_name FROM metadata WHERE active=1)`,
			wantMetrics: []string{}, // Subqueries in IN are ignored per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH20 - Derived metric",
			query:       `SELECT * FROM metrics WHERE metric_name = concat('cpu','_usage')`,
			wantMetrics: []string{}, // Non-literal expressions ignored per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH21 - No metric filter",
			query:       `SELECT * FROM metrics WHERE timestamp > now() - INTERVAL 1 HOUR`,
			wantMetrics: []string{},
			wantGroupBy: []string{},
		},
		{
			name:        "CH22 - Compound logic",
			query:       `SELECT * FROM metrics WHERE (metric_name='cpu' AND region='us') OR (metric_name='mem' AND region='eu')`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH23 - UNION query",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' UNION ALL SELECT * FROM metrics WHERE metric_name='mem'`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH24 - Contradiction",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' AND metric_name!='cpu'`,
			wantMetrics: []string{"cpu"}, // Positive filter extracted
			wantGroupBy: []string{},
		},
		{
			name:        "CH25 - Mixed inclusion/exclusion logic",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') OR metric_name NOT IN ('net')`,
			wantMetrics: []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupBy: []string{},
		},
		{
			name:        "CH26 - HAVING clause",
			query:       `SELECT region, count() FROM metrics WHERE metric_name='cpu' GROUP BY region HAVING region!='us'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH27 - Multi-statement",
			query:       `SELECT * FROM metrics; SELECT * FROM metrics WHERE metric_name='mem';`,
			wantMetrics: []string{"mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH28 - ORDER BY",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region, team ORDER BY avg(value)`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region", "team"},
		},
		{
			name:        "CH29 - SETTINGS clause",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' SETTINGS max_threads=8`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH30 - Invalid syntax",
			query:       `SELECT FROM metrics WHERE`,
			wantMetrics: []string{},
			wantGroupBy: []string{},
			wantError:   true,
		},
		{
			name:        "CH31 - Aliased table reference",
			query:       `SELECT m.region, avg(m.value) FROM metrics AS m WHERE m.metric_name='cpu' GROUP BY m.region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH32 - Nested subquery referencing alias",
			query:       `SELECT * FROM (SELECT * FROM metrics WHERE metric_name='cpu') AS sub WHERE sub.metric_name='mem'`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH33 - WITH TOTALS clause",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name IN ('cpu','mem') AND region IN ('us','eu') GROUP BY region WITH TOTALS`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH34 - FORMAT clause",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region FORMAT JSON`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH35 - PREWHERE clause",
			query:       `SELECT region, avg(value) FROM metrics PREWHERE metric_name='cpu' GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH36 - SAMPLE clause",
			query:       `SELECT region, avg(value) FROM metrics SAMPLE 0.1 WHERE metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH37 - Self-group on metric_name",
			query:       `SELECT metric_name, count() FROM metrics WHERE metric_name='cpu' GROUP BY metric_name,region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"metric_name", "region"},
		},
		{
			name:        "CH38 - ANY() array literal form",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name = any(['cpu','mem'])`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH39 - ARRAY JOIN",
			query:       `SELECT * FROM metrics ARRAY JOIN tags AS tag WHERE metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH40 - Conditional aggregate",
			query:       `SELECT region, sumIf(value, metric_name='cpu') FROM metrics GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH41 - Conditional aggregate multi",
			query:       `SELECT region, sumIf(value, metric_name IN ('cpu','mem')) FROM metrics GROUP BY region`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH42 - GLOBAL IN operator",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name GLOBAL IN ('cpu','mem')`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH43 - FINAL modifier",
			query:       `SELECT * FROM metrics FINAL WHERE metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH44 - SETTINGS clause",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region SETTINGS allow_experimental_parallel_reading=1`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH45 - LIMIT BY clause",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') LIMIT 100 BY region`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH46 - WINDOW function",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name='cpu' WINDOW w AS (PARTITION BY region ORDER BY timestamp)`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH47 - Window function inline",
			query:       `SELECT region, avg(value) OVER (PARTITION BY region) FROM metrics WHERE metric_name='cpu'`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH48 - CASE expression",
			query:       `SELECT CASE WHEN metric_name='cpu' THEN value*2 ELSE value END FROM metrics`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH49 - Subquery referencing same table",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' AND value > (SELECT avg(value) FROM metrics WHERE metric_name='cpu')`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH50 - EXISTS subquery",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND EXISTS (SELECT 1 FROM metrics WHERE metric_name='disk')`,
			wantMetrics: []string{"cpu", "mem", "disk"},
			wantGroupBy: []string{},
			wantError:   false, // Parser may fail on EXISTS with SELECT 1, but we'll try
		},
		{
			name:        "CH51 - Subquery on non-metric table",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' AND region IN (SELECT region FROM regions WHERE active=1)`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH52 - HAVING aggregate",
			query:       `SELECT avg(value) FROM metrics WHERE metric_name='cpu' GROUP BY region HAVING count() > 10`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH53 - Combined IN + NOT LIKE",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu','mem') AND metric_name NOT LIKE 'disk%'`,
			wantMetrics: []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupBy: []string{},
		},
		{
			name:        "CH54 - GROUP BY WITH ROLLUP",
			query:       `SELECT metric_name FROM metrics WHERE metric_name IN ('cpu','mem') GROUP BY metric_name WITH ROLLUP`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{"metric_name"},
		},
		{
			name:        "CH55 - GROUP BY WITH CUBE",
			query:       `SELECT region, sum(value) FROM metrics WHERE metric_name='cpu' GROUP BY region WITH CUBE`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH56 - Nested logic in parentheses",
			query:       `SELECT * FROM metrics WHERE metric_name='cpu' AND (value > 90 OR (metric_name='mem' AND region='us'))`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH57 - ORDER + LIMIT + OFFSET",
			query:       `SELECT region, avg(value) FROM metrics WHERE metric_name IN ('cpu','mem') GROUP BY region ORDER BY region DESC LIMIT 10 OFFSET 5`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "CH58 - SETTINGS inside query",
			query:       `SELECT * FROM metrics WHERE metric_name IN ('cpu') SETTINGS optimize_move_to_prewhere=0`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH59 - Function around literal",
			query:       `SELECT * FROM metrics WHERE metric_name in lowercase('cpu')`,
			wantMetrics: []string{}, // Function-wrapped literal treated as non-literal per spec
			wantGroupBy: []string{},
		},
		{
			name:        "CH60 - Mixed positive & negative",
			query:       `SELECT * FROM metrics WHERE metric_name = 'cpu' OR (metric_name = 'mem' AND metric_name != 'disk')`,
			wantMetrics: []string{"cpu", "mem"}, // Only positive filters extracted
			wantGroupBy: []string{},
		},
		{
			name:        "CH61 - metric_name on right side (equality)",
			query:       `SELECT * FROM metrics WHERE 'cpu' = metric_name`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH62 - metric_name on right side (complex OR)",
			query:       `SELECT * FROM metrics WHERE ('cpu' = metric_name OR 'mem' = metric_name) AND region = 'us'`,
			wantMetrics: []string{"cpu", "mem"},
			wantGroupBy: []string{},
		},
		{
			name:        "CH63 - metric_name on right side with GROUP BY",
			query:       `SELECT avg(value) FROM metrics WHERE 'cpu' = metric_name GROUP BY region`,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region"},
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
			gotGroupBy := sortStrings(result.GroupBy)
			wantGroupBy := sortStrings(tt.wantGroupBy)

			if !reflect.DeepEqual(gotMetrics, wantMetrics) {
				t.Errorf("Extract() MetricNames = %v, want %v, query %s", gotMetrics, wantMetrics, tt.query)
			}
			if !reflect.DeepEqual(gotGroupBy, wantGroupBy) {
				t.Errorf("Extract() GroupBy = %v, want %v, query %s", gotGroupBy, wantGroupBy, tt.query)
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
