package logstelemetryschema

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPatternExpr(t *testing.T) {
	expr := PatternExpr()
	assert.True(t, strings.HasPrefix(expr, "ifNull(nullIf(trimBoth(replaceRegexpAll("), expr)
	assert.True(t, strings.HasSuffix(expr, "), ''), '<EMPTY>')"), expr)
	assert.Equal(t, len(patternMasks), strings.Count(expr, "replaceRegexpAll("))
	// the cut counts characters, so it never splits one
	assert.Contains(t, expr, "leftUTF8(body_v2.message, 2048)")
	// ClickHouse string literals escape the backslash
	assert.Contains(t, expr, `'(^|[^A-Za-z0-9])[A-Za-z]*[0-9][A-Za-z0-9]*', '\\1<*>'`)
	// keys keep their quotes: protected by a marker while values become <STR>
	assert.Contains(t, expr, "'\"([^\"]*)\"(\\\\s*[:=])', '\x01\\\\1\x01\\\\2'")
	// clickhouse-go scans a query without regard to string literals: it binds a
	// '?' to an argument, reads {...:...} as a query parameter and $N as a
	// numbered argument
	for _, forbidden := range []string{"?", "{", "}", "$"} {
		assert.NotContains(t, expr, forbidden)
	}
}

func TestPatternLiteralWords(t *testing.T) {
	testCases := []struct {
		name     string
		pattern  string
		limit    int
		expected []string
	}{
		{
			name:     "LongestFirst_TiesInOrder",
			pattern:  "No active replica has part <*>. Will fetch merged part instead.",
			limit:    3,
			expected: []string{"replica", "instead", "active"},
		},
		{
			name:     "PlaceholderNamesAreNotWords",
			pattern:  "<TS> ERROR order <*> failed after <*> <UUID> <EMAIL>",
			limit:    10,
			expected: []string{"failed", "error", "order", "after"},
		},
		{
			name:     "ShortAndNonASCIIWordsSkipped",
			pattern:  "GET /v1/api café naïveté ok",
			limit:    10,
			expected: nil,
		},
		{
			name:     "KeysKept_SplitOnUnderscore_Lowercase_Unique",
			pattern:  "Cache miss key=<*> for request_id=<*> cache",
			limit:    10,
			expected: []string{"request", "cache", "miss"},
		},
		{
			name:     "OnlyPlaceholders",
			pattern:  "<IP>",
			limit:    3,
			expected: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, PatternLiteralWords(testCase.pattern, testCase.limit))
		})
	}
}

func TestPatternFilterRegexp(t *testing.T) {
	testCases := []struct {
		pattern string
		matches []string
		misses  []string
	}{
		{
			pattern: "User <*> logged in from <IP>",
			matches: []string{"User <*> logged in from <IP>", "User <UUID> logged in from <IP>", "User <EMAIL> logged in from <IP>", "User <UUID> logged in from <*>"},
			misses:  []string{"User alice logged in from <IP>", "User <UUID> logged in from <HEX>", "User <UUID> logged in from <IP> again", "User <UUID><IP> logged in from <IP>", "User <EMPTY> logged in from <IP>", "User <NIL> logged in from <IP>"},
		},
		{
			pattern: "User <UUID> logged in",
			matches: []string{"User <UUID> logged in", "User <*> logged in"},
			misses:  []string{"User <IP> logged in", "User <UUIDS> logged in"},
		},
		{
			pattern: "GET /a.b?(c) [x] <*>",
			matches: []string{"GET /a.b?(c) [x] <HEX>"},
			misses:  []string{"GET /aXb?(c) [x] <HEX>"},
		},
		{
			pattern: "got <nil> for <*>",
			matches: []string{"got <nil> for <IP>"},
			misses:  []string{"got <*> for <IP>", "got <IP> for <IP>"},
		},
		{
			pattern: "<EMPTY>",
			matches: []string{"<EMPTY>"},
			misses:  []string{"<*>"},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.pattern, func(t *testing.T) {
			re := regexp.MustCompile(PatternFilterRegexp(testCase.pattern))
			for _, text := range testCase.matches {
				assert.True(t, re.MatchString(text), text)
			}
			for _, text := range testCase.misses {
				assert.False(t, re.MatchString(text), text)
			}
		})
	}
}

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
	pattern := PatternExpr()
	anyValue := `(<UUID>|<MAC>|<TS>|<IP>|<EMAIL>|<URL>|<HEX>|<FRAME>|<STR>|<\*>)`

	testCases := []struct {
		name          string
		query         string
		expectedQuery string
		expectedArgs  []any
		expectedError string
	}{
		{
			name:          "Wildcard_SearchesBodyForFixedWordsFirst_ThenMatchesAnyPlaceholder",
			query:         "pattern('No active replica has part <*>. Will fetch merged part instead.')",
			expectedQuery: "WHERE (LOWER(body_v2.message) LIKE ? AND LOWER(body_v2.message) LIKE ? AND LOWER(body_v2.message) LIKE ? AND match(" + pattern + ", ?))",
			expectedArgs:  []any{"%replica%", "%instead%", "%active%", `^No active replica has part ` + anyValue + `\. Will fetch merged part instead\.$`},
		},
		{
			name:          "NamedPlaceholder_MatchesItselfOrWildcard",
			query:         "pattern('User <UUID> logged in from <IP>')",
			expectedQuery: "WHERE (LOWER(body_v2.message) LIKE ? AND LOWER(body_v2.message) LIKE ? AND LOWER(body_v2.message) LIKE ? AND match(" + pattern + ", ?))",
			expectedArgs:  []any{"%logged%", "%user%", "%from%", `^User (<UUID>|<\*>) logged in from (<IP>|<\*>)$`},
		},
		{
			name:          "NoPlaceholders_ComparedExactly",
			query:         "pattern('Server started')",
			expectedQuery: "WHERE (LOWER(body_v2.message) LIKE ? AND LOWER(body_v2.message) LIKE ? AND " + pattern + " = ?)",
			expectedArgs:  []any{"%started%", "%server%", "Server started"},
		},
		{
			name:          "Empty_ComparedExactly",
			query:         "pattern('<EMPTY>')",
			expectedQuery: "WHERE " + pattern + " = ?",
			expectedArgs:  []any{"<EMPTY>"},
		},
		{
			name:          "NoFixedWords_PatternOnly",
			query:         "pattern('<IP>')",
			expectedQuery: "WHERE match(" + pattern + ", ?)",
			expectedArgs:  []any{`^(<IP>|<\*>)$`},
		},
		{
			name:          "Several_AnyOfThem",
			query:         `pattern('<IP>', "can't connect to <IP>")`,
			expectedQuery: "WHERE (match(" + pattern + ", ?) OR (LOWER(body_v2.message) LIKE ? AND match(" + pattern + ", ?)))",
			expectedArgs:  []any{`^(<IP>|<\*>)$`, "%connect%", `^can't connect to (<IP>|<\*>)$`},
		},
		{
			name:          "EscapedQuote",
			query:         `pattern('can\'t <*>')`,
			expectedQuery: "WHERE match(" + pattern + ", ?)",
			expectedArgs:  []any{`^can't ` + anyValue + `$`},
		},
		{
			name:          "Not_Excludes",
			query:         "service.name = 'api' AND NOT pattern('<IP>')",
			expectedQuery: "WHERE (multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND NOT (match(" + pattern + ", ?)))",
			expectedArgs:  []any{"api", `^(<IP>|<\*>)$`},
		},
		{
			name:          "PatternKeyStaysAKey",
			query:         "pattern = 'x'",
			expectedQuery: "WHERE ((attributes_string['pattern'] = ? AND mapContains(attributes_string, 'pattern')) OR (JSON_VALUE(body, '$.\"pattern\"') = ? AND JSON_EXISTS(body, '$.\"pattern\"')))",
			expectedArgs:  []any{"x", "x"},
		},
		{
			name:          "NoPattern_Rejected",
			query:         "pattern()",
			expectedError: "syntax error",
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
			assert.Equal(t, strings.Contains(testCase.query, "pattern("), clause.RequiresCostGuard)
		})
	}
}
