package querybuilder

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateReadOnlySelect(t *testing.T) {
	testCases := []struct {
		name  string
		query string
		pass  bool
	}{
		{
			name:  "Select_Valid",
			query: "SELECT region AS r, zone FROM metrics WHERE metric_name = 'cpu' GROUP BY region, zone",
			pass:  true,
		},
		{
			name:  "SelectWithTrailingSemicolon_Valid",
			query: "SELECT count() FROM signoz_logs.distributed_logs_v2;",
			pass:  true,
		},
		{
			name:  "CommonTableExpression_Valid",
			query: "WITH t AS (SELECT fingerprint FROM signoz_metrics.time_series_v4 GROUP BY fingerprint) SELECT * FROM t",
			pass:  true,
		},
		{
			name:  "Join_Valid",
			query: "SELECT * FROM t1 LEFT JOIN t2 ON t1.a = t2.b",
			pass:  true,
		},
		{
			name:  "GlobalIn_Valid",
			query: "SELECT a FROM t WHERE a GLOBAL IN (SELECT b FROM t2)",
			pass:  true,
		},
		{
			name:  "Union_Valid",
			query: "SELECT * FROM t UNION ALL SELECT * FROM t2",
			pass:  true,
		},
		{
			name:  "WindowFunction_Valid",
			query: "SELECT sum(v) OVER (PARTITION BY a ORDER BY t) FROM t",
			pass:  true,
		},
		{
			name:  "UnrelatedSetting_Valid",
			query: "SELECT * FROM t SETTINGS max_threads = 4",
			pass:  true,
		},
		{
			name:  "Empty_Invalid",
			query: "",
			pass:  false,
		},
		{
			name:  "Unparseable_Invalid",
			query: "SELECT FROM WHERE",
			pass:  false,
		},
		{
			name:  "MultipleStatements_Invalid",
			query: "SELECT 1; DROP TABLE signoz_logs.logs_v2",
			pass:  false,
		},
		{
			name:  "Drop_Invalid",
			query: "DROP TABLE signoz_logs.logs_v2",
			pass:  false,
		},
		{
			name:  "Insert_Invalid",
			query: "INSERT INTO signoz_logs.logs_v2 SELECT * FROM signoz_logs.logs_v2",
			pass:  false,
		},
		{
			name:  "AlterDelete_Invalid",
			query: "ALTER TABLE signoz_logs.logs_v2 DELETE WHERE 1 = 1",
			pass:  false,
		},
		{
			name:  "Truncate_Invalid",
			query: "TRUNCATE TABLE signoz_logs.logs_v2",
			pass:  false,
		},
		{
			name:  "CreateTable_Invalid",
			query: "CREATE TABLE evil (a Int) ENGINE = Memory",
			pass:  false,
		},
		{
			name:  "AttachTable_Invalid",
			query: "ATTACH TABLE x",
			pass:  false,
		},
		{
			name:  "Optimize_Invalid",
			query: "OPTIMIZE TABLE signoz_logs.logs_v2 FINAL",
			pass:  false,
		},
		{
			name:  "Grant_Invalid",
			query: "GRANT ALL ON *.* TO admin",
			pass:  false,
		},
		{
			name:  "Describe_Invalid",
			query: "DESCRIBE TABLE signoz_logs.logs_v2",
			pass:  false,
		},
		{
			name:  "Set_Invalid",
			query: "SET readonly = 0",
			pass:  false,
		},
		{
			name:  "ShowGrants_Invalid",
			query: "SHOW GRANTS",
			pass:  false,
		},
		{
			name:  "System_Invalid",
			query: "SYSTEM SHUTDOWN",
			pass:  false,
		},
		{
			name:  "Kill_Invalid",
			query: "KILL QUERY WHERE 1",
			pass:  false,
		},
		{
			name:  "IntoOutfile_Invalid",
			query: "SELECT * FROM t INTO OUTFILE '/tmp/x.csv'",
			pass:  false,
		},
		{
			name:  "UrlTableFunction_Invalid",
			query: "SELECT * FROM url('http://attacker.example/x', CSV, 'a String')",
			pass:  false,
		},
		{
			name:  "FileTableFunction_Invalid",
			query: "SELECT * FROM file('/etc/passwd', CSV, 'a String')",
			pass:  false,
		},
		{
			name:  "RemoteTableFunction_Invalid",
			query: "SELECT * FROM remote('attacker:9000', system.users)",
			pass:  false,
		},
		{
			name:  "S3TableFunction_Invalid",
			query: "SELECT * FROM s3('https://x/y.csv', 'CSV')",
			pass:  false,
		},
		{
			name:  "MysqlTableFunction_Invalid",
			query: "SELECT * FROM mysql('host:3306', 'db', 'tbl', 'u', 'p')",
			pass:  false,
		},
		{
			name:  "ExecutableTableFunction_Invalid",
			query: "SELECT * FROM executable('script.sh', CSV, 'a String')",
			pass:  false,
		},
		{
			name:  "ClusterTableFunction_Invalid",
			query: "SELECT * FROM cluster('c', system, users)",
			pass:  false,
		},
		{
			name:  "TableFunctionInJoin_Invalid",
			query: "SELECT * FROM t1 JOIN url('http://x', CSV, 'a String') u ON 1 = 1",
			pass:  false,
		},
		{
			name:  "TableFunctionInScalarSubquery_Invalid",
			query: "SELECT (SELECT * FROM url('http://x', CSV, 'a String'))",
			pass:  false,
		},
		{
			name:  "TableFunctionInCommonTableExpression_Invalid",
			query: "WITH c AS (SELECT * FROM url('http://x', CSV, 'a String')) SELECT * FROM c",
			pass:  false,
		},
		{
			name:  "TableFunctionInNestedSubquery_Invalid",
			query: "SELECT * FROM (SELECT * FROM (SELECT * FROM file('/etc/passwd', CSV, 'a String')))",
			pass:  false,
		},
		{
			name:  "TableFunctionInWhereSubquery_Invalid",
			query: "SELECT * FROM t WHERE a IN (SELECT * FROM url('http://x', CSV, 'a String'))",
			pass:  false,
		},
		{
			name:  "TableFunctionInUnion_Invalid",
			query: "SELECT * FROM t UNION ALL SELECT * FROM url('http://x', CSV, 'a String')",
			pass:  false,
		},
		{
			name:  "ReadonlySettingOverride_Invalid",
			query: "SELECT * FROM t SETTINGS readonly = 0",
			pass:  false,
		},
		{
			name:  "ReadonlySettingOverrideUppercase_Invalid",
			query: "SELECT * FROM t SETTINGS READONLY = 0",
			pass:  false,
		},
		{
			name:  "ReadonlySettingOverrideAlongsideOthers_Invalid",
			query: "SELECT * FROM t SETTINGS max_threads = 4, readonly = 0",
			pass:  false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ValidateReadOnlySelect(testCase.query)

			if testCase.pass {
				assert.NoError(t, err)
				return
			}

			assert.Error(t, err)
		})
	}
}
