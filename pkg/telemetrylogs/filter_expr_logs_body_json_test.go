package telemetrylogs

import (
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// TestFilterExprLogsBodyJSON tests a comprehensive set of query patterns for body JSON search
func TestFilterExprLogsBodyJSON(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	// Define a comprehensive set of field keys to support all test cases
	keys := buildCompleteFieldKeyMap()

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           instrumentationtest.New().Logger(),
		FieldMapper:      fm,
		ConditionBuilder: cb,
		FieldKeys:        keys,
		FullTextColumn: &telemetrytypes.TelemetryFieldKey{
			Name: "body",
		},
		JsonBodyPrefix: "body",
		JsonKeyToKey:   GetBodyJSONKey,
	}

	testCases := []struct {
		category              string
		query                 string
		shouldPass            bool
		expectedQuery         string
		expectedArgs          []any
		expectedErrorContains string
	}{
		{
			category:              "json",
			query:                 "has(body.requestor_list[*], 'index_service')",
			shouldPass:            true,
			expectedQuery:         `WHERE has(JSONExtract(JSON_QUERY(body, '$."requestor_list"[*]'), 'Array(String)'), ?)`,
			expectedArgs:          []any{"index_service"},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "has(body.int_numbers[*], 2)",
			shouldPass:            true,
			expectedQuery:         `WHERE has(JSONExtract(JSON_QUERY(body, '$."int_numbers"[*]'), 'Array(Float64)'), ?)`,
			expectedArgs:          []any{float64(2)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "has(body.bool[*], true)",
			shouldPass:            true,
			expectedQuery:         `WHERE has(JSONExtract(JSON_QUERY(body, '$."bool"[*]'), 'Array(Bool)'), ?)`,
			expectedArgs:          []any{true},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "NOT has(body.nested_num[*].float_nums[*], 2.2)",
			shouldPass:            true,
			expectedQuery:         `WHERE NOT (has(JSONExtract(JSON_QUERY(body, '$."nested_num"[*]."float_nums"[*]'), 'Array(Float64)'), ?))`,
			expectedArgs:          []any{float64(2.2)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.message = hello",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSON_VALUE(body, '$."message"') = ? AND JSON_EXISTS(body, '$."message"'))`,
			expectedArgs:          []any{"hello"},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.status = 1",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSONExtract(JSON_VALUE(body, '$."status"'), 'Float64') = ? AND JSON_EXISTS(body, '$."status"'))`,
			expectedArgs:          []any{float64(1)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.status = 1.1",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSONExtract(JSON_VALUE(body, '$."status"'), 'Float64') = ? AND JSON_EXISTS(body, '$."status"'))`,
			expectedArgs:          []any{float64(1.1)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.boolkey = true",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSONExtract(JSON_VALUE(body, '$."boolkey"'), 'Bool') = ? AND JSON_EXISTS(body, '$."boolkey"'))`,
			expectedArgs:          []any{true},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.status > 200",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSONExtract(JSON_VALUE(body, '$."status"'), 'Float64') > ? AND JSON_EXISTS(body, '$."status"'))`,
			expectedArgs:          []any{float64(200)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.message REGEXP 'a*'",
			shouldPass:            true,
			expectedQuery:         `WHERE (match(JSON_VALUE(body, '$."message"'), ?) AND JSON_EXISTS(body, '$."message"'))`,
			expectedArgs:          []any{"a*"},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 `body.message CONTAINS "hello 'world'"`,
			shouldPass:            true,
			expectedQuery:         `WHERE (LOWER(JSON_VALUE(body, '$."message"')) LIKE LOWER(?) AND JSON_EXISTS(body, '$."message"'))`,
			expectedArgs:          []any{"%hello 'world'%"},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 `body.message EXISTS`,
			shouldPass:            true,
			expectedQuery:         `WHERE JSON_EXISTS(body, '$."message"')`,
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 `body.name IN ('hello', 'world')`,
			shouldPass:            true,
			expectedQuery:         `WHERE ((JSON_VALUE(body, '$."name"') = ? OR JSON_VALUE(body, '$."name"') = ?) AND JSON_EXISTS(body, '$."name"'))`,
			expectedArgs:          []any{"hello", "world"},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 `body.value IN (200, 300)`,
			shouldPass:            true,
			expectedQuery:         `WHERE ((JSONExtract(JSON_VALUE(body, '$."value"'), 'Float64') = ? OR JSONExtract(JSON_VALUE(body, '$."value"'), 'Float64') = ?) AND JSON_EXISTS(body, '$."value"'))`,
			expectedArgs:          []any{float64(200), float64(300)},
			expectedErrorContains: "",
		},
		{
			category:              "json",
			query:                 "body.key-with-hyphen = true",
			shouldPass:            true,
			expectedQuery:         `WHERE (JSONExtract(JSON_VALUE(body, '$."key-with-hyphen"'), 'Bool') = ? AND JSON_EXISTS(body, '$."key-with-hyphen"'))`,
			expectedArgs:          []any{true},
			expectedErrorContains: "",
		},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("%s: %s", tc.category, limitString(tc.query, 50)), func(t *testing.T) {

            clause, err := querybuilder.PrepareWhereClause(tc.query, opts, 0, 0)

			if tc.shouldPass {
				if err != nil {
					t.Errorf("Failed to parse query: %s\nError: %v\n", tc.query, err)
					return
				}

				if clause == nil {
					t.Errorf("Expected clause for query: %s\n", tc.query)
					return
				}

				// Build the SQL and print it for debugging
				sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)

				require.Equal(t, tc.expectedQuery, sql)
				require.Equal(t, tc.expectedArgs, args)

			} else {
				require.Error(t, err, "Expected error for query: %s", tc.query)
				require.Contains(t, err.Error(), tc.expectedErrorContains)
			}
		})
	}
}
