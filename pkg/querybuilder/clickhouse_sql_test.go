package querybuilder

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/stretchr/testify/assert"
)

func TestErrIfStatementIsNotValid_Pass(t *testing.T) {
	testCases := []struct {
		name  string
		query string
	}{
		// Shapes a telemetry read is allowed to take.
		{"Select", "SELECT region AS r, zone FROM metrics WHERE metric_name = 'cpu' GROUP BY region, zone"},
		{"TrailingSemicolon", "SELECT count() FROM signoz_logs.distributed_logs_v2;"},
		{"CommonTableExpression", "WITH t AS (SELECT fingerprint FROM signoz_metrics.time_series_v4) SELECT * FROM t"},
		{"Join", "SELECT * FROM t1 LEFT JOIN t2 ON t1.a = t2.b"},
		{"GlobalIn", "SELECT a FROM t WHERE a GLOBAL IN (SELECT b FROM t2)"},
		// GLOBAL parsed only when the join type was omitted, and only before IN. https://github.com/AfterShip/clickhouse-sql-parser/pull/293
		{"GlobalLeftJoin", "SELECT * FROM t1 GLOBAL LEFT JOIN t2 ON t1.a = t2.a"},
		{"GlobalNotIn", "SELECT a FROM t WHERE a GLOBAL NOT IN (SELECT b FROM t2)"},
		{"Union", "SELECT * FROM t UNION ALL SELECT * FROM t2"},
		{"Intersect", "SELECT * FROM t INTERSECT SELECT * FROM t2"},
		{"WindowFunction", "SELECT sum(v) OVER (PARTITION BY a ORDER BY t) FROM t"},
		{"UnrelatedSetting", "SELECT * FROM t SETTINGS max_threads = 4"},
		{"TerminatedBlockComment", "SELECT /* keep me */ count() FROM t"},
		{"BlockCommentMarkerInsideStringLiteral", "SELECT count() FROM t WHERE body = '/* not a comment'"},
		// The parser used to loop forever on this; it now reads the comment to the end of
		// the input, so this doubles as a canary for that regression.
		{"TrailingUnterminatedBlockComment", "SELECT count() FROM t /* unterminated"},
		// The rule keys on the database, not on the table name.
		{"TableNamedSystemInTelemetryDatabase", "SELECT * FROM signoz_logs.system"},
		{"SignedLiteralAfterClosingParenSpaced", "SELECT (toUnixTimestamp(now()) - 3600)*1000000000"},
		// order by interval
		{"OrderByInterval", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval ORDER BY interval"},
		{"OrderByIntervalAndDirection", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS `interval` ORDER BY `interval` ASC"},
		// `interval` is a unit keyword, so unquoting it was rejected everywhere the parser
		// expected a plain identifier. https://github.com/AfterShip/clickhouse-sql-parser/pull/296
		{"OrderByUnquotedIntervalAsc", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval FROM t GROUP BY interval ORDER BY interval ASC"},
		{"OrderByUnquotedIntervalDesc", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval FROM t GROUP BY interval ORDER BY interval DESC"},
		{"UnquotedIntervalInGroupByTuple", "SELECT a FROM t GROUP BY (`service.name`, `service.version`, interval)"},
		{"UnquotedIntervalProductionQuery", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, resource_string_service$$name AS `service.name`, attributes_string['http.route'] AS `http.route`, quantile(0.95)(duration_nano) / 1000000000 AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_string_service$$name = 'svc-a' AND resources_string['deployment.environment'] = 'dev' AND attributes_string['http.route'] = '/v1' AND http_method = 'POST' AND timestamp BETWEEN toDateTime(1784601720) AND toDateTime(1784602620) AND ts_bucket_start BETWEEN 1784601720 - 1800 AND 1784602620 GROUP BY `service.name`, `http.route`, interval ORDER BY interval ASC"},
		// Separating the two readings of INTERVAL needs backtracking as per the current implementation which could have performance regressions.
		// https://github.com/AfterShip/clickhouse-sql-parser/pull/296#issuecomment-5150316367
		{"UnquotedIntervalRepeatedThirtyTimes", "SELECT interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval AS total FROM t WHERE interval > 0 ORDER BY interval ASC"},
		{"SignedLiteralAfterClosingParenUnspaced", "SELECT now() AS ts, toFloat64(count()) AS value FROM ( SELECT attributes_string['TableName'] AS T, attributes_string['MissingId'] AS M, max(fromUnixTimestamp64Nano(timestamp)) AS last_seen, dateDiff('minute', min(fromUnixTimestamp64Nano(timestamp)), max(fromUnixTimestamp64Nano(timestamp))) AS age_min FROM signoz_logs.distributed_logs_v2 WHERE body='missing_map_record' AND timestamp >= (toUnixTimestamp(now())-3600)*1000000000 GROUP BY T, M ) WHERE age_min >= 20 AND last_seen >= now() - toIntervalMinute(8)"},
		{"SignedLiteralAfterClosingParenMinimal", "SELECT (1)-1"},
		{"TrimFunction", "SELECT trimBoth('/api/endpoint/', '/');"},
		// The SQL-standard keyword-separated argument forms, which took commas only. https://github.com/AfterShip/clickhouse-sql-parser/pull/290
		{"StandardTrimSyntax", "SELECT trim(BOTH ' ' FROM body) FROM t"},
		{"StandardSubstringSyntax", "SELECT substring(body FROM 2 FOR 3) FROM t"},
		{"StandardOverlaySyntax", "SELECT overlay(body PLACING 'x' FROM 2) FROM t"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// Bounded rather than called directly: a parser that backtracks without memoising
			// hangs instead of returning. Every case here parses in well under a millisecond.
			errC := make(chan error, 1)
			go func() { errC <- ErrIfStatementIsNotValid(testCase.query) }()

			select {
			case err := <-errC:
				assert.NoError(t, err)
			case <-time.After(10 * time.Second):
				assert.Fail(t, "timed out, which means the parser is no longer bounding its backtracking")
			}
		})
	}
}

func TestErrIfStatementIsNotValid_Fail(t *testing.T) {
	testCases := []struct {
		name         string
		query        string
		expectedCode errors.Code
	}{
		// Not a single statement, or not a statement at all.
		{"Empty", "", CodeClickHouseSQLNotSingleStatement},
		{"UnterminatedBlockCommentOnly", "/* x", CodeClickHouseSQLUnparseable},
		{"Unparseable", "SELECT FROM WHERE", CodeClickHouseSQLUnparseable},
		{"MultipleStatements", "SELECT 1; DROP TABLE signoz_logs.logs_v2", CodeClickHouseSQLNotSingleStatement},
		// Parses, but is not a SELECT.
		{"Drop", "DROP TABLE signoz_logs.logs_v2", CodeClickHouseSQLNotSelect},
		{"Insert", "INSERT INTO signoz_logs.logs_v2 SELECT * FROM signoz_logs.logs_v2", CodeClickHouseSQLNotSelect},
		{"AlterDelete", "ALTER TABLE signoz_logs.logs_v2 DELETE WHERE 1 = 1", CodeClickHouseSQLNotSelect},
		{"CreateTable", "CREATE TABLE evil (a Int) ENGINE = Memory", CodeClickHouseSQLNotSelect},
		{"Grant", "GRANT ALL ON *.* TO admin", CodeClickHouseSQLNotSelect},
		{"Set", "SET readonly = 0", CodeClickHouseSQLNotSelect},
		// The parser still dereferences nil on a DEFAULT expression it cannot read, so the recover is what turns this into a rejection rather than a crash.
		{"UnparseableDefaultExpression", "CREATE TABLE t (a String DEFAULT foo(b FROM 2)) ENGINE = Memory", CodeClickHouseSQLParserPanic},
		// These the parser rejects outright rather than classifying.
		{"ShowGrants", "SHOW GRANTS", CodeClickHouseSQLUnparseable},
		{"IntoOutfile", "SELECT * FROM t INTO OUTFILE '/tmp/x.csv'", CodeClickHouseSQLUnparseable},
		// Table functions, which read through something other than a telemetry table.
		{"UrlTableFunction", "SELECT * FROM url('http://attacker.example/x', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		{"FileTableFunction", "SELECT * FROM file('/etc/passwd', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		{"ExecutableTableFunction", "SELECT * FROM executable('script.sh', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		{"TableFunctionInJoin", "SELECT * FROM t1 JOIN url('http://x', CSV, 'a String') u ON 1 = 1", CodeClickHouseSQLTableFunction},
		{"TableFunctionInCommonTableExpression", "WITH c AS (SELECT * FROM url('http://x', CSV, 'a String')) SELECT * FROM c", CodeClickHouseSQLTableFunction},
		{"TableFunctionInWhereSubquery", "SELECT * FROM t WHERE a IN (SELECT * FROM file('/etc/passwd', CSV, 'a String'))", CodeClickHouseSQLTableFunction},
		{"TableFunctionInUnion", "SELECT * FROM t UNION ALL SELECT * FROM url('http://x', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		// Internal databases, which hold grants and server metadata rather than telemetry.
		{"SystemUsers", "SELECT * FROM system.users", CodeClickHouseSQLInternalDatabase},
		{"SystemUppercase", "SELECT * FROM SYSTEM.USERS", CodeClickHouseSQLInternalDatabase},
		{"SystemQuoted", "SELECT count() FROM `system`.`tables`", CodeClickHouseSQLInternalDatabase},
		{"SystemInSubquery", "SELECT * FROM (SELECT name FROM system.parts)", CodeClickHouseSQLInternalDatabase},
		{"SystemInJoin", "SELECT * FROM signoz_logs.distributed_logs_v2 AS l JOIN system.users AS u ON 1 = 1", CodeClickHouseSQLInternalDatabase},
		{"SystemInIntersect", "SELECT * FROM t INTERSECT SELECT * FROM system.users", CodeClickHouseSQLInternalDatabase},
		{"InformationSchema", "SELECT * FROM information_schema.tables", CodeClickHouseSQLInternalDatabase},
		// A query-level setting takes precedence over the one the caller applies.
		{"ReadonlySettingOverride", "SELECT * FROM t SETTINGS readonly = 0", CodeClickHouseSQLReadonlyOverride},
		{"ReadonlySettingOverrideAmongOthers", "SELECT * FROM t SETTINGS max_threads = 4, readonly = 0", CodeClickHouseSQLReadonlyOverride},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)

			assert.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.expectedCode), "expected code %s, got %v", testCase.expectedCode, err)
		})
	}
}

// Queries ClickHouse runs that this rejects anyway. Each is a known false positive.
func TestErrIfStatementIsNotValid_ShouldPassButFails(t *testing.T) {
	testCases := []struct {
		name         string
		query        string
		expectedCode errors.Code
	}{
		{
			// numbers() generates rows rather than reading through anything, so the blanket
			// table-function rule is stricter here than the threat it exists for. This shape
			// builds a dense interval axis to CROSS JOIN against, and is the only rejection
			// left in the saved production corpus.
			name: "NumbersTableFunction",
			query: `SELECT
			  intervals.interval AS interval,
			  active.cluster AS cluster,
			  toFloat64(if(ts_data.has_data = 0, 0, 1)) AS value
			FROM (
			  SELECT DISTINCT
			    JSONExtractString(labels, 'k8s.cluster.name') AS cluster
			  FROM signoz_metrics.distributed_time_series_v4
			  WHERE metric_name = 'benchmark_average_processing_time.max'
			    AND unix_milli >= toUnixTimestamp(now() - INTERVAL 30 DAY) * 1000
			  HAVING cluster != ''
			) AS active
			CROSS JOIN (
			  SELECT toStartOfInterval(
			    toDateTime(toUnixTimestamp(now() - INTERVAL 30 MINUTE) + number * 60),
			    INTERVAL 1 MINUTE
			  ) AS interval
			  FROM numbers(31)
			) AS intervals
			LEFT JOIN (
			  SELECT
			    toStartOfInterval(
			      toDateTime(intDiv(s.unix_milli, 1000)),
			      INTERVAL 1 MINUTE
			    ) AS interval,
			    JSONExtractString(ts.labels, 'k8s.cluster.name') AS cluster,
			    1 AS has_data
			  FROM signoz_metrics.distributed_samples_v4 s
			  INNER JOIN (
			    SELECT DISTINCT fingerprint, labels
			    FROM signoz_metrics.distributed_time_series_v4
			    WHERE metric_name = 'benchmark_average_processing_time.max'
			  ) AS ts ON s.fingerprint = ts.fingerprint
			  WHERE s.metric_name = 'benchmark_average_processing_time.max'
			    AND s.unix_milli >= toUnixTimestamp(now() - INTERVAL 30 MINUTE) * 1000
			  GROUP BY interval, cluster
			) AS ts_data
			  ON active.cluster = ts_data.cluster
			  AND intervals.interval = ts_data.interval
			ORDER BY interval ASC`,
			expectedCode: CodeClickHouseSQLTableFunction,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)

			assert.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.expectedCode), "expected code %s, got %v", testCase.expectedCode, err)
		})
	}
}
