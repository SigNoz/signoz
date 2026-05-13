package telemetrylogs

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSearchFunctionFTS(t *testing.T) {
	fl := flaggertest.New(t)
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	ctx := context.Background()
	fm := NewFieldMapper(fl)
	cb := NewConditionBuilder(fm, fl)
	keys := buildCompleteFieldKeyMap(releaseTime)
	for _, field := range IntrinsicFields {
		f := field
		keys[field.Name] = append(keys[field.Name], &f)
	}

	startNs := uint64(releaseTime.Add(-1 * time.Hour).UnixNano())
	endNs := uint64(releaseTime.Add(1 * time.Hour).UnixNano())

	makeOpts := func(ftsKeys []*telemetrytypes.TelemetryFieldKey) querybuilder.FilterExprVisitorOpts {
		return querybuilder.FilterExprVisitorOpts{
			Context:          ctx,
			Logger:           instrumentationtest.New().Logger(),
			FieldMapper:      fm,
			ConditionBuilder: cb,
			FieldKeys:        keys,
			JsonKeyToKey:     GetBodyJSONKey,
			StartNs:          startNs,
			EndNs:            endNs,
			FTSFieldKeys:     ftsKeys,
		}
	}

	t.Run("search quoted string fans out to all columns", func(t *testing.T) {
		clause, err := querybuilder.PrepareWhereClause("search('error')", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)
		require.NotNil(t, clause)
		sql, _ := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		// Must touch all 8 targets: body, severity_text, trace_id, span_id, plus 4 map pairs
		assert.Contains(t, sql, "match(LOWER(body), LOWER(?))")
		assert.Contains(t, sql, "match(severity_text, ?)")
		assert.Contains(t, sql, "match(trace_id, ?)")
		assert.Contains(t, sql, "match(span_id, ?)")
		assert.Contains(t, sql, "arrayExists(x -> match(x, ?), mapKeys(attributes_string))")
		assert.Contains(t, sql, "arrayExists(x -> match(x, ?), mapValues(attributes_string))")
		assert.Contains(t, sql, "arrayExists(x -> match(x, ?), mapKeys(attributes_number))")
		assert.Contains(t, sql, "arrayExists(x -> match(x, ?), mapKeys(attributes_bool))")
		assert.Contains(t, sql, "arrayExists(x -> match(x, ?), mapKeys(resources_string))")
	})

	t.Run("search unquoted token produces same result as quoted", func(t *testing.T) {
		quoted, err := querybuilder.PrepareWhereClause("search('error')", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)
		unquoted, err := querybuilder.PrepareWhereClause("search(error)", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)

		sqlQ, argsQ := quoted.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		sqlU, argsU := unquoted.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Equal(t, sqlQ, sqlU)
		assert.Equal(t, argsQ, argsU)
	})

	t.Run("NOT search wraps entire condition", func(t *testing.T) {
		clause, err := querybuilder.PrepareWhereClause("NOT search('healthcheck')", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)
		require.NotNil(t, clause)
		sql, _ := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "NOT (")
	})

	t.Run("search combined with other filter", func(t *testing.T) {
		clause, err := querybuilder.PrepareWhereClause("search('error') AND severity_text = 'ERROR'", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)
		require.NotNil(t, clause)
		sql, _ := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "match(LOWER(body), LOWER(?))")
		assert.Contains(t, sql, "severity_text = ?")
	})

	t.Run("search invalid regex is escaped as literal", func(t *testing.T) {
		clause, err := querybuilder.PrepareWhereClause("search('[ERROR-1234]')", makeOpts(DefaultFTSFieldKeys))
		require.NoError(t, err)
		require.NotNil(t, clause)
		_, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		// FormatFullTextSearch escapes invalid regex — all args should be the escaped form
		for _, arg := range args {
			if s, ok := arg.(string); ok {
				assert.Equal(t, `\[ERROR-1234\]`, s)
			}
		}
	})

	t.Run("search with FTSColumnKeys nil returns error", func(t *testing.T) {
		_, err := querybuilder.PrepareWhereClause("search('error')", makeOpts(nil))
		require.Error(t, err)
		_, _, _, _, _, additionals := errors.Unwrapb(err)
		found := false
		for _, a := range additionals {
			if strings.Contains(a, "search() is only supported for log queries") {
				found = true
				break
			}
		}
		assert.True(t, found, "expected 'only supported for log queries' error, got: %v", additionals)
	})

	t.Run("search with window exceeding 6 hours returns error", func(t *testing.T) {
		opts := makeOpts(DefaultFTSFieldKeys)
		opts.StartNs = uint64(releaseTime.UnixNano())
		opts.EndNs = uint64(releaseTime.Add(7 * time.Hour).UnixNano())
		_, err := querybuilder.PrepareWhereClause("search('error')", opts)
		require.Error(t, err)
		_, _, _, _, _, additionals := errors.Unwrapb(err)
		found := false
		for _, a := range additionals {
			if strings.Contains(a, "6-hour") {
				found = true
				break
			}
		}
		assert.True(t, found, "expected 6-hour window error, got: %v", additionals)
	})
}
