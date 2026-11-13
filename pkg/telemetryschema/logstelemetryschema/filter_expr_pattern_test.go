package logstelemetryschema

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestFilterExprPattern(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	opts := querybuilder.FilterExprVisitorOpts{
		Context:        context.Background(),
		Logger:         instrumentationtest.New().Logger(),
		Storage:        NewStorage(),
		Query:          querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, flaggertest.New(t), telemetrytypes.SignalLogs, nil, uint64(releaseTime.Add(-5*time.Minute).UnixNano()), uint64(releaseTime.Add(5*time.Minute).UnixNano())),
		FieldKeys:      BuildCompleteFieldKeyMap(releaseTime),
		FullTextColumn: DefaultFullTextColumn,
	}

	testCases := []struct {
		name          string
		query         string
		expectedQuery string
		expectedArgs  []any
		expectedError string
	}{
		{
			name:          "OnePattern_NotSupportedYet",
			query:         "pattern('User <*> logged in from <IP>')",
			expectedError: "function `pattern` is not supported yet",
		},
		{
			name:          "SeveralPatterns_NotSupportedYet",
			query:         `pattern('<IP>', "can't connect to <IP>")`,
			expectedError: "function `pattern` is not supported yet",
		},
		{
			name:          "Not_NotSupportedYet",
			query:         "service.name = 'api' AND NOT pattern('<IP>')",
			expectedError: "function `pattern` is not supported yet",
		},
		{
			name:          "SpaceBeforeParenthesis_NotSupportedYet",
			query:         "PATTERN ('<IP>')",
			expectedError: "function `pattern` is not supported yet",
		},
		{
			name:          "NewlineBeforeParenthesis_NotSupportedYet",
			query:         "pattern\r\n('<IP>')",
			expectedError: "function `pattern` is not supported yet",
		},
		{
			name:          "NoPattern_SyntaxError",
			query:         "pattern()",
			expectedError: "syntax error",
		},
		{
			name:          "PatternKey_StaysAKey",
			query:         "pattern = 'x'",
			expectedQuery: "WHERE ((attributes_string['pattern'] = ? AND mapContains(attributes_string, 'pattern')) OR (JSON_VALUE(body, '$.\"pattern\"') = ? AND JSON_EXISTS(body, '$.\"pattern\"')))",
			expectedArgs:  []any{"x", "x"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			clause, err := querybuilder.PrepareWhereClause(testCase.query, opts)
			if testCase.expectedError != "" {
				require.Error(t, err)
				assert.True(t, strings.Contains(err.Error(), testCase.expectedError) || detailContains(err, testCase.expectedError), err.Error())
				return
			}
			require.NoError(t, err)
			sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Equal(t, testCase.expectedQuery, sql)
			assert.Equal(t, testCase.expectedArgs, args)
		})
	}
}
