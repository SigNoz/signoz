package querybuilder

import (
	"testing"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		{"SignedLiteralAfterClosingParen", "SELECT (toUnixTimestamp(now()) - 3600)*1000000000"},
		// order by interval
		{"OrderByInterval", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval ORDER BY interval"},
		{"OrderByIntervalAndDirection", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS `interval` ORDER BY `interval` ASC"},
		{"TrimFunction", "SELECT trimBoth('/api/endpoint/', '/');"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)
			assert.NoError(t, err)
		})
	}
}

func TestErrIfStatementIsNotValid_Fail(t *testing.T) {
	testCases := []struct {
		name  string
		query string
	}{
		// Not a single statement, or not a statement at all.
		{"Empty", ""},
		{"UnterminatedBlockCommentOnly", "/* x"},
		{"Unparseable", "SELECT FROM WHERE"},
		{"MultipleStatements", "SELECT 1; DROP TABLE signoz_logs.logs_v2"},
		// Parses, but is not a SELECT.
		{"Drop", "DROP TABLE signoz_logs.logs_v2"},
		{"Insert", "INSERT INTO signoz_logs.logs_v2 SELECT * FROM signoz_logs.logs_v2"},
		{"AlterDelete", "ALTER TABLE signoz_logs.logs_v2 DELETE WHERE 1 = 1"},
		{"CreateTable", "CREATE TABLE evil (a Int) ENGINE = Memory"},
		{"Grant", "GRANT ALL ON *.* TO admin"},
		{"Set", "SET readonly = 0"},
		// These the parser rejects outright rather than classifying.
		{"ShowGrants", "SHOW GRANTS"},
		{"IntoOutfile", "SELECT * FROM t INTO OUTFILE '/tmp/x.csv'"},
		// Table functions, which read through something other than a telemetry table.
		{"UrlTableFunction", "SELECT * FROM url('http://attacker.example/x', CSV, 'a String')"},
		{"FileTableFunction", "SELECT * FROM file('/etc/passwd', CSV, 'a String')"},
		{"ExecutableTableFunction", "SELECT * FROM executable('script.sh', CSV, 'a String')"},
		{"TableFunctionInJoin", "SELECT * FROM t1 JOIN url('http://x', CSV, 'a String') u ON 1 = 1"},
		{"TableFunctionInCommonTableExpression", "WITH c AS (SELECT * FROM url('http://x', CSV, 'a String')) SELECT * FROM c"},
		{"TableFunctionInWhereSubquery", "SELECT * FROM t WHERE a IN (SELECT * FROM file('/etc/passwd', CSV, 'a String'))"},
		{"TableFunctionInUnion", "SELECT * FROM t UNION ALL SELECT * FROM url('http://x', CSV, 'a String')"},
		// Internal databases, which hold grants and server metadata rather than telemetry.
		{"SystemUsers", "SELECT * FROM system.users"},
		{"SystemUppercase", "SELECT * FROM SYSTEM.USERS"},
		{"SystemQuoted", "SELECT count() FROM `system`.`tables`"},
		{"SystemInSubquery", "SELECT * FROM (SELECT name FROM system.parts)"},
		{"SystemInJoin", "SELECT * FROM signoz_logs.distributed_logs_v2 AS l JOIN system.users AS u ON 1 = 1"},
		{"SystemInIntersect", "SELECT * FROM t INTERSECT SELECT * FROM system.users"},
		{"InformationSchema", "SELECT * FROM information_schema.tables"},
		// A query-level setting takes precedence over the one the caller applies.
		{"ReadonlySettingOverride", "SELECT * FROM t SETTINGS readonly = 0"},
		{"ReadonlySettingOverrideAmongOthers", "SELECT * FROM t SETTINGS max_threads = 4, readonly = 0"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)
			assert.Error(t, err)
		})
	}
}

// Queries the parser cannot read. ClickHouse runs all of them.
func TestErrIfStatementIsNotValid_ShouldPassButFails(t *testing.T) {
	testCases := []struct {
		name  string
		query string
		// The construct the parser stops after, which is the one it cannot read.
		expectedStopsAfter string
		// The same construct written so the parser accepts it.
		fix string
	}{
		{
			name:               "IntervalAliasInOrderBy",
			query:              "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, resource_string_service$$name AS `service.name`, attributes_string['http.route'] AS `http.route`, quantile(0.95)(duration_nano) / 1000000000 AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_string_service$$name = 'svc-a' AND resources_string['deployment.environment'] = 'dev' AND attributes_string['http.route'] = '/v1' AND http_method = 'POST' AND timestamp BETWEEN toDateTime(1784601720) AND toDateTime(1784602620) AND ts_bucket_start BETWEEN 1784601720 - 1800 AND 1784602620 GROUP BY `service.name`, `http.route`, interval ORDER BY interval ASC",
			expectedStopsAfter: "ORDER BY interval ASC",
			fix:                "SELECT count() AS interval FROM t ORDER BY `interval` ASC",
		},
		{
			name:               "IntervalAliasInOrderByDesc",
			query:              "SELECT count() AS value, toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, serviceName, resourceTagsMap['deployment.environment'] AS environment, exceptionStacktrace FROM signoz_traces.distributed_signoz_error_index_v2 WHERE exceptionType != 'OSError' AND resourceTagsMap['deployment.environment'] = 'staging' AND timestamp BETWEEN toDateTime(1785186300) AND toDateTime(1785186600) GROUP BY serviceName, interval, environment, exceptionStacktrace ORDER BY interval DESC",
			expectedStopsAfter: "ORDER BY interval DESC",
			fix:                "SELECT count() AS interval FROM t ORDER BY `interval` DESC",
		},
		{
			name:               "StandardTrimSyntax",
			query:              "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 5 MINUTE) AS interval, resources_string['host.name'] as host_name, toFloat64(countIf( lower(trim(BOTH ' ' FROM replaceOne( JSONExtractString(body, 'Action'), 'health_status: ', '' ))) IN ('unhealthy','starting','failing') )) as value FROM signoz_logs.distributed_logs_v2 WHERE timestamp BETWEEN 1784602320000000000 AND 1784602620000000000 AND ts_bucket_start BETWEEN 1784602320 - 300 AND 1784602620 AND JSONExtractString(body, 'Type') = 'container' AND JSONExtractString(body, 'Actor', 'Attributes', 'name') IS NOT NULL AND resources_string['host.name'] IS NOT NULL AND resources_string['host.name'] = 'aihub-nightly' GROUP BY interval, host_name ORDER BY interval, host_name",
			expectedStopsAfter: "trim(BOTH '",
			fix:                "SELECT trimBoth(replaceOne( JSONExtractString(body, 'Action'), 'health_status: ', '' ), ' ')",
		},
		{
			name:               "SignedLiteralAfterClosingParen",
			query:              "SELECT now() AS ts, toFloat64(count()) AS value FROM ( SELECT attributes_string['TableName'] AS T, attributes_string['MissingId'] AS M, max(fromUnixTimestamp64Nano(timestamp)) AS last_seen, dateDiff('minute', min(fromUnixTimestamp64Nano(timestamp)), max(fromUnixTimestamp64Nano(timestamp))) AS age_min FROM signoz_logs.distributed_logs_v2 WHERE body='missing_map_record' AND timestamp >= (toUnixTimestamp(now())-3600)*1000000000 GROUP BY T, M ) WHERE age_min >= 20 AND last_seen >= now() - toIntervalMinute(8)",
			expectedStopsAfter: "(toUnixTimestamp(now())",
			fix:                "SELECT (toUnixTimestamp(now()) - 3600) * 1000000000",
		},
		{
			name:               "SignedLiteralAfterClosingParenMinimal",
			query:              "SELECT (1)-1",
			expectedStopsAfter: "(1)",
			fix:                "SELECT (1) - 1",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)

			var parseErr *chparser.ParseError
			require.ErrorAs(t, err, &parseErr, "expected a parser failure rather than a rule violation")

			// The parser reports the offset it stopped at, which sits just past the construct
			// it choked on, so the text leading up to it is what needs looking at.
			consumed := testCase.query[:parseErr.Pos]
			assert.Equal(t, testCase.expectedStopsAfter, consumed[max(0, len(consumed)-len(testCase.expectedStopsAfter)):])

			assert.NoError(t, ErrIfStatementIsNotValid(testCase.fix))
		})
	}
}
