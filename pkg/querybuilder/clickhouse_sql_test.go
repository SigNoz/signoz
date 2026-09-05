package querybuilder

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestErrIfStatementIsNotValid_Pass(t *testing.T) {
	testCases := []struct {
		name  string
		query string
	}{
		{"Select", "SELECT region AS r, zone FROM metrics WHERE metric_name = 'cpu' GROUP BY region, zone"},
		{"TrailingSemicolon", "SELECT count() FROM signoz_logs.distributed_logs_v2;"},
		{"CommonTableExpression", "WITH t AS (SELECT fingerprint FROM signoz_metrics.time_series_v4) SELECT * FROM t"},
		{"Join", "SELECT * FROM t1 LEFT JOIN t2 ON t1.a = t2.b"},
		{"GlobalIn", "SELECT a FROM t WHERE a GLOBAL IN (SELECT b FROM t2)"},
		// https://github.com/AfterShip/clickhouse-sql-parser/pull/293
		{"GlobalLeftJoin", "SELECT * FROM t1 GLOBAL LEFT JOIN t2 ON t1.a = t2.a"},
		{"GlobalNotIn", "SELECT a FROM t WHERE a GLOBAL NOT IN (SELECT b FROM t2)"},
		{"Union", "SELECT * FROM t UNION ALL SELECT * FROM t2"},
		{"Intersect", "SELECT * FROM t INTERSECT SELECT * FROM t2"},
		// A parenthesised left operand of a set operator. https://github.com/AfterShip/clickhouse-sql-parser/pull/312
		{"ParenthesisedUnionLeftOperand", "SELECT a FROM ((SELECT 1 AS a) UNION ALL (SELECT 2 AS a))"},
		{"ParenthesisedExceptLeftOperand", "SELECT a FROM ((SELECT 1 AS a) EXCEPT (SELECT 2 AS a))"},
		{"ParenthesisedUnionLeftOperandAtStatementLevel", "(SELECT 1 AS a) UNION ALL (SELECT 2 AS a)"},
		{"WindowFunction", "SELECT sum(v) OVER (PARTITION BY a ORDER BY t) FROM t"},
		{"UnrelatedSetting", "SELECT * FROM t SETTINGS max_threads = 4"},
		{"TerminatedBlockComment", "SELECT /* keep me */ count() FROM t"},
		{"BlockCommentMarkerInsideStringLiteral", "SELECT count() FROM t WHERE body = '/* not a comment'"},
		// Looped forever before v0.5.2.
		{"TrailingUnterminatedBlockComment", "SELECT count() FROM t /* unterminated"},
		// Keyed on the database, not on the table name.
		{"TableNamedSystemInTelemetryDatabase", "SELECT * FROM signoz_logs.system"},
		{"SignedLiteralAfterClosingParenSpaced", "SELECT (toUnixTimestamp(now()) - 3600)*1000000000"},
		{"OrderByInterval", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval ORDER BY interval"},
		{"OrderByIntervalAndDirection", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS `interval` ORDER BY `interval` ASC"},
		// https://github.com/AfterShip/clickhouse-sql-parser/pull/296
		{"OrderByUnquotedIntervalAsc", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval FROM t GROUP BY interval ORDER BY interval ASC"},
		{"OrderByUnquotedIntervalDesc", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval FROM t GROUP BY interval ORDER BY interval DESC"},
		{"UnquotedIntervalInGroupByTuple", "SELECT a FROM t GROUP BY (`service.name`, `service.version`, interval)"},
		{"UnquotedIntervalProductionQuery", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, resource_string_service$$name AS `service.name`, attributes_string['http.route'] AS `http.route`, quantile(0.95)(duration_nano) / 1000000000 AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_string_service$$name = 'svc-a' AND resources_string['deployment.environment'] = 'dev' AND attributes_string['http.route'] = '/v1' AND http_method = 'POST' AND timestamp BETWEEN toDateTime(1784601720) AND toDateTime(1784602620) AND ts_bucket_start BETWEEN 1784601720 - 1800 AND 1784602620 GROUP BY `service.name`, `http.route`, interval ORDER BY interval ASC"},
		// The fix backtracks, so this bounds the cost. https://github.com/AfterShip/clickhouse-sql-parser/pull/296#issuecomment-5150316367
		{"UnquotedIntervalRepeatedThirtyTimes", "SELECT interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval + interval AS total FROM t WHERE interval > 0 ORDER BY interval ASC"},
		// `interval` was one of 37 such keywords. https://github.com/AfterShip/clickhouse-sql-parser/pull/305
		{"UnquotedLimitInFunctionArgument", "SELECT sum(limit) FROM t"},
		{"UnquotedLimitInArithmetic", "SELECT limit + 1 FROM t"},
		{"UnquotedLimitInNegation", "SELECT abs(-limit) FROM t"},
		{"UnquotedKeywordOperands", "SELECT sum(offset) + sum(format) + sum(settings) FROM t"},
		{"UnquotedLimitProductionQuery", "WITH limit_value AS (SELECT cluster, region, value AS limit FROM t) SELECT region AS `Region`, sum(limit) AS `Capacity` FROM limit_value GROUP BY Region"},
		{"SignedLiteralAfterClosingParenUnspaced", "SELECT now() AS ts, toFloat64(count()) AS value FROM ( SELECT attributes_string['TableName'] AS T, attributes_string['MissingId'] AS M, max(fromUnixTimestamp64Nano(timestamp)) AS last_seen, dateDiff('minute', min(fromUnixTimestamp64Nano(timestamp)), max(fromUnixTimestamp64Nano(timestamp))) AS age_min FROM signoz_logs.distributed_logs_v2 WHERE body='missing_map_record' AND timestamp >= (toUnixTimestamp(now())-3600)*1000000000 GROUP BY T, M ) WHERE age_min >= 20 AND last_seen >= now() - toIntervalMinute(8)"},
		{"SignedLiteralAfterClosingParenMinimal", "SELECT (1)-1"},
		{"TrimFunction", "SELECT trimBoth('/api/endpoint/', '/');"},
		// https://github.com/AfterShip/clickhouse-sql-parser/pull/290
		{"StandardTrimSyntax", "SELECT trim(BOTH ' ' FROM body) FROM t"},
		{"StandardSubstringSyntax", "SELECT substring(body FROM 2 FOR 3) FROM t"},
		{"StandardOverlaySyntax", "SELECT overlay(body PLACING 'x' FROM 2) FROM t"},
		// The shape row generators get used for: a dense interval axis to CROSS JOIN a sparse series against.
		{"NumbersTableFunction", "SELECT intervals.interval AS interval, active.cluster AS cluster, toFloat64(if(ts_data.has_data = 0, 0, 1)) AS value FROM ( SELECT DISTINCT JSONExtractString(labels, 'k8s.cluster.name') AS cluster FROM signoz_metrics.distributed_time_series_v4 WHERE metric_name = 'my_metric' AND unix_milli >= toUnixTimestamp(now() - INTERVAL 30 DAY) * 1000 HAVING cluster != '' ) AS active CROSS JOIN ( SELECT toStartOfInterval( toDateTime(toUnixTimestamp(now() - INTERVAL 30 MINUTE) + number * 60), INTERVAL 1 MINUTE ) AS interval FROM numbers(31) ) AS intervals LEFT JOIN ( SELECT toStartOfInterval( toDateTime(intDiv(s.unix_milli, 1000)), INTERVAL 1 MINUTE ) AS interval, JSONExtractString(ts.labels, 'k8s.cluster.name') AS cluster, 1 AS has_data FROM signoz_metrics.distributed_samples_v4 s INNER JOIN ( SELECT DISTINCT fingerprint, labels FROM signoz_metrics.distributed_time_series_v4 WHERE metric_name = 'my_metric' ) AS ts ON s.fingerprint = ts.fingerprint WHERE s.metric_name = 'my_metric' AND s.unix_milli >= toUnixTimestamp(now() - INTERVAL 30 MINUTE) * 1000 GROUP BY interval, cluster ) AS ts_data ON active.cluster = ts_data.cluster AND intervals.interval = ts_data.interval ORDER BY interval ASC"},
		{"NumbersMtTableFunction", "SELECT * FROM numbers_mt(31)"},
		{"ZerosTableFunction", "SELECT * FROM zeros(31)"},
		{"ZerosMtTableFunction", "SELECT * FROM zeros_mt(31)"},
		{"GenerateSeriesTableFunction", "SELECT * FROM generateSeries(1, 10)"},
		{"GenerateSeriesSnakeCaseTableFunction", "SELECT * FROM generate_series(1, 10)"},
		{"GeneratorTableFunctionUppercase", "SELECT * FROM NUMBERS(31)"},
		{"GeneratorTableFunctionParenthesisedArgument", "SELECT * FROM NUMBERS((31))"},
		// CAST in an argument was itself read as a table function. https://github.com/AfterShip/clickhouse-sql-parser/pull/307
		{"CastInGeneratorTableFunctionArgument", "SELECT * FROM numbers(CAST(10 AS UInt64))"},
		{"ScalarCallInGeneratorTableFunctionArgument", "SELECT * FROM numbers(intDiv(100, 2))"},
		{"NestedScalarCallInGeneratorTableFunctionArgument", "SELECT * FROM numbers(greatest(1, intDiv(100, 2) + 1))"},
		{"GeneratorTableFunctionProductionQuery", "WITH toInt64(1786029960000000000) AS start_ns, toInt64(1786031760000000000) AS end_ns, 300000000000 AS step_ns SELECT ts, toFloat64(sum(value)) AS value FROM (SELECT fromUnixTimestamp64Nano(start_ns + toInt64(number) * step_ns) AS ts, 0 AS value FROM numbers(greatest(1, intDiv(end_ns - start_ns, step_ns) + 1)) UNION ALL SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 5 minute) AS ts, count() AS value FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= 1786029960000000000 AND timestamp <= 1786031760000000000 GROUP BY ts) GROUP BY ts ORDER BY ts"},
		// The allow list keys on the bare name, so quoting must not hide a generator from it.
		{"BacktickQuotedGeneratorTableFunction", "SELECT * FROM `numbers`(31)"},
		{"DoubleQuotedGeneratorTableFunction", "SELECT * FROM \"numbers\"(31)"},
		// Reads nothing: format builds a string, and shares its name with a table function.
		{"ScalarFunctionNamedAfterATableFunction", "SELECT format('{} {}', a, b) FROM t"},
		{"GeneratorTableFunctionInJoin", "SELECT * FROM signoz_logs.distributed_logs_v2 AS l CROSS JOIN numbers(31) AS n"},
		{"GeneratorTableFunctionInCommonTableExpression", "WITH axis AS (SELECT number FROM numbers(31)) SELECT * FROM axis"},
		{"GeneratorTableFunctionInWhereSubquery", "SELECT * FROM t WHERE a IN (SELECT number FROM numbers(31))"},
		{"GeneratorTableFunctionInUnion", "SELECT number FROM numbers(31) UNION ALL SELECT number FROM zeros(31)"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// Bounded because a parser that backtracks without memoising hangs rather than returning.
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
		{"Empty", "", CodeClickHouseSQLNotSingleStatement},
		{"UnterminatedBlockCommentOnly", "/* x", CodeClickHouseSQLUnparseable},
		{"Unparseable", "SELECT FROM WHERE", CodeClickHouseSQLUnparseable},
		{"MultipleStatements", "SELECT 1; DROP TABLE signoz_logs.logs_v2", CodeClickHouseSQLNotSingleStatement},
		{"Drop", "DROP TABLE signoz_logs.logs_v2", CodeClickHouseSQLNotSelect},
		{"Insert", "INSERT INTO signoz_logs.logs_v2 SELECT * FROM signoz_logs.logs_v2", CodeClickHouseSQLNotSelect},
		{"AlterDelete", "ALTER TABLE signoz_logs.logs_v2 DELETE WHERE 1 = 1", CodeClickHouseSQLNotSelect},
		{"CreateTable", "CREATE TABLE evil (a Int) ENGINE = Memory", CodeClickHouseSQLNotSelect},
		{"Grant", "GRANT ALL ON *.* TO admin", CodeClickHouseSQLNotSelect},
		{"Set", "SET readonly = 0", CodeClickHouseSQLNotSelect},
		// Both panicked before v0.5.5. https://github.com/AfterShip/clickhouse-sql-parser/pull/306
		{"UnparseableDefaultExpression", "CREATE TABLE t (a String DEFAULT foo(b FROM 2)) ENGINE = Memory", CodeClickHouseSQLUnparseable},
		{"TrailingOperatorInDefaultExpression", "CREATE TABLE t (a String DEFAULT 1 +) ENGINE = Memory", CodeClickHouseSQLUnparseable},
		// Rejected outright rather than classified.
		{"ShowGrants", "SHOW GRANTS", CodeClickHouseSQLUnparseable},
		{"IntoOutfile", "SELECT * FROM t INTO OUTFILE '/tmp/x.csv'", CodeClickHouseSQLUnparseable},
		{"UrlTableFunction", "SELECT * FROM url('http://attacker.example/x', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		// file is also a scalar function, so the reading rule reaches it before the table rule does.
		{"FileTableFunction", "SELECT * FROM file('/etc/passwd', CSV, 'a String')", CodeClickHouseSQLReadingFunction},
		{"ExecutableTableFunction", "SELECT * FROM executable('script.sh', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		{"TableFunctionInJoin", "SELECT * FROM t1 JOIN url('http://x', CSV, 'a String') u ON 1 = 1", CodeClickHouseSQLTableFunction},
		{"TableFunctionInCommonTableExpression", "WITH c AS (SELECT * FROM url('http://x', CSV, 'a String')) SELECT * FROM c", CodeClickHouseSQLTableFunction},
		{"TableFunctionInWhereSubquery", "SELECT * FROM t WHERE a IN (SELECT * FROM url('http://x', CSV, 'a String'))", CodeClickHouseSQLTableFunction},
		{"TableFunctionInUnion", "SELECT * FROM t UNION ALL SELECT * FROM url('http://x', CSV, 'a String')", CodeClickHouseSQLTableFunction},
		// Reach an internal database without naming one, so only the table-function rule sees them.
		{"MergeTableFunction", "SELECT * FROM merge('system', '.*')", CodeClickHouseSQLTableFunction},
		{"RemoteTableFunction", "SELECT * FROM remote('other-host', 'system.users')", CodeClickHouseSQLTableFunction},
		{"ClusterTableFunction", "SELECT * FROM cluster('c', 'system.users')", CodeClickHouseSQLTableFunction},
		// Pure, but excluded: generateRandom is unbounded, and values adds nothing over an array literal.
		{"GenerateRandomTableFunction", "SELECT * FROM generateRandom('a UInt64')", CodeClickHouseSQLTableFunction},
		{"ValuesTableFunction", "SELECT * FROM values('a UInt64', 1, 2)", CodeClickHouseSQLTableFunction},
		// Arguments are visited first, so an allowed generator is not a wrapper to smuggle a read through.
		{"InternalDatabaseInsideAllowedTableFunction", "SELECT * FROM numbers((SELECT count() FROM system.users))", CodeClickHouseSQLInternalDatabase},
		{"InternalDatabaseJoinedOntoAllowedTableFunction", "SELECT * FROM numbers(31) AS n JOIN system.users AS u ON 1 = 1", CodeClickHouseSQLInternalDatabase},
		{"InternalDatabaseUnionedWithAllowedTableFunction", "SELECT number FROM numbers(31) UNION ALL SELECT name FROM system.users", CodeClickHouseSQLInternalDatabase},
		{"RefusedTableFunctionJoinedOntoAllowedTableFunction", "SELECT * FROM numbers(31) AS n JOIN url('http://x', CSV, 'a String') AS u ON 1 = 1", CodeClickHouseSQLTableFunction},
		{"RefusedTableFunctionInsideAllowedTableFunction", "SELECT * FROM numbers((SELECT count() FROM url('http://x', CSV, 'a String')))", CodeClickHouseSQLTableFunction},
		{"InternalDatabaseInsideAllowedTableFunctionCommonTableExpression", "WITH axis AS (SELECT * FROM numbers((SELECT count() FROM system.users))) SELECT * FROM axis", CodeClickHouseSQLInternalDatabase},
		// Read a file, a dictionary or the server binary without naming a table, so neither the table rule nor the database rule sees them. The row count alone is an oracle: numbers(length(file(x))) returns one row per byte.
		{"ScalarFileFunction", "SELECT file('/etc/passwd')", CodeClickHouseSQLReadingFunction},
		{"ScalarFileFunctionInWhere", "SELECT * FROM t WHERE length(file('/etc/passwd')) > 0", CodeClickHouseSQLReadingFunction},
		{"ScalarFileFunctionInGeneratorTableFunctionArgument", "SELECT * FROM numbers(length(file('/etc/passwd')))", CodeClickHouseSQLReadingFunction},
		{"DictionaryFunction", "SELECT dictGetUInt64('d', 'k', toUInt64(1))", CodeClickHouseSQLReadingFunction},
		{"DictionaryFunctionUppercase", "SELECT DICTGETSTRING('d', 'k', toUInt64(1))", CodeClickHouseSQLReadingFunction},
		{"DictionaryFunctionInGeneratorTableFunctionArgument", "SELECT * FROM numbers(dictGetUInt64('d', 'k', toUInt64(1)))", CodeClickHouseSQLReadingFunction},
		{"IntrospectionFunction", "SELECT demangle(addressToSymbol(toUInt64(1)))", CodeClickHouseSQLReadingFunction},
		{"ModelEvaluationFunction", "SELECT catboostEvaluate('/model.bin', 1)", CodeClickHouseSQLReadingFunction},
		// ClickHouse reads `x IN table` as `x IN (SELECT * FROM table)`, and a qualified name there is a Path rather than a TableIdentifier.
		{"InternalDatabaseInInOperator", "SELECT * FROM t WHERE a IN system.users", CodeClickHouseSQLInternalDatabase},
		{"InternalDatabaseInGlobalInOperator", "SELECT * FROM t WHERE a GLOBAL IN system.users", CodeClickHouseSQLInternalDatabase},
		{"InternalDatabaseInNotInOperator", "SELECT * FROM t WHERE a NOT IN system.users", CodeClickHouseSQLInternalDatabase},
		{"SystemUsers", "SELECT * FROM system.users", CodeClickHouseSQLInternalDatabase},
		{"SystemUppercase", "SELECT * FROM SYSTEM.USERS", CodeClickHouseSQLInternalDatabase},
		{"SystemQuoted", "SELECT count() FROM `system`.`tables`", CodeClickHouseSQLInternalDatabase},
		{"SystemInSubquery", "SELECT * FROM (SELECT name FROM system.parts)", CodeClickHouseSQLInternalDatabase},
		{"SystemInJoin", "SELECT * FROM signoz_logs.distributed_logs_v2 AS l JOIN system.users AS u ON 1 = 1", CodeClickHouseSQLInternalDatabase},
		{"SystemInIntersect", "SELECT * FROM t INTERSECT SELECT * FROM system.users", CodeClickHouseSQLInternalDatabase},
		{"InformationSchema", "SELECT * FROM information_schema.tables", CodeClickHouseSQLInternalDatabase},
		// Takes precedence over the setting the caller applies.
		{"ReadonlySettingOverride", "SELECT * FROM t SETTINGS readonly = 0", CodeClickHouseSQLReadonlyOverride},
		{"ReadonlySettingOverrideAmongOthers", "SELECT * FROM t SETTINGS max_threads = 4, readonly = 0", CodeClickHouseSQLReadonlyOverride},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)

			// Required rather than asserted: errors.Asc dereferences the error it is given.
			require.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.expectedCode), "expected code %s, got %v", testCase.expectedCode, err)
		})
	}
}

func TestErrIfStatementIsNotValid_ShouldPassButFails(t *testing.T) {
	testCases := []struct {
		name         string
		query        string
		expectedCode errors.Code
	}{
		// The one keyword PR 305 left behind, because ON also opens a join condition.
		{"UnquotedOnAsColumnName", "SELECT on + 1 FROM t", CodeClickHouseSQLUnparseable},
		// ClickHouse accepts NULLS FIRST|LAST as an ORDER BY modifier; the parser's grammar has no rule for it.
		{"OrderByNullsLast", "SELECT x FROM t ORDER BY x DESC NULLS LAST", CodeClickHouseSQLUnparseable},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ErrIfStatementIsNotValid(testCase.query)

			// Required rather than asserted: errors.Asc dereferences the error it is given.
			require.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.expectedCode), "expected code %s, got %v", testCase.expectedCode, err)
		})
	}
}
