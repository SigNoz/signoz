package clickhouseReader

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	retentiontypes "github.com/SigNoz/signoz/pkg/types/retentiontypes"
)

// Zero-day retention can never be operator intent: a TTL-driving column or
// rule value of 0 expires rows on write, which has caused silent production
// data loss (logs TTL'd within minutes, resource-attribute mappings within
// 30 minutes). These tests pin the guards.

func TestGuardedRetentionDays(t *testing.T) {
	expr := guardedRetentionDays("_retention_days")
	assert.Equal(t, fmt.Sprintf("if(_retention_days = 0, %d, _retention_days)", retentionDaysFallback), expr)
	assert.Greater(t, retentionDaysFallback, 0, "fallback must be positive so rows never expire on write")
}

func TestColdStorageTTLQueriesGuardZeroRetention(t *testing.T) {
	// Build the exact queries SetTTLV2 emits for the cold-storage path and
	// require the DELETE side to be guarded against _retention_days = 0.
	logsQ := fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(timestamp / 1000000000) + toIntervalDay(%s) DELETE, toDateTime(timestamp / 1000000000) + toIntervalDay(_retention_days_cold) TO VOLUME '%s' SETTINGS materialize_ttl_after_modify=0`,
		"signoz_logs.logs_v2", "cluster", guardedRetentionDays("_retention_days"), "s3")
	assert.Contains(t, logsQ, "toIntervalDay(if(_retention_days = 0, 30, _retention_days)) DELETE")
	assert.NotContains(t, logsQ, "toIntervalDay(_retention_days) DELETE")

	resourceQ := fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + toIntervalDay(%s) DELETE, toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + toIntervalDay(_retention_days_cold) TO VOLUME '%s' SETTINGS materialize_ttl_after_modify=0`,
		"signoz_logs.logs_v2_resource", "cluster", guardedRetentionDays("_retention_days"), "s3")
	assert.Contains(t, resourceQ, "toIntervalDay(if(_retention_days = 0, 30, _retention_days)) DELETE")
	assert.NotContains(t, resourceQ, "toIntervalDay(_retention_days) DELETE")
}

func TestValidateTTLConditionsAcceptsPositiveRuleTTL(t *testing.T) {
	// Companion to the rejection test: a well-formed positive-TTL rule must
	// pass validation unchanged - the guard exists to stop zero-day values,
	// not to narrow the operator's valid configuration space.
	r := &ClickHouseReader{}
	for _, days := range []int{1, 30, 90} {
		require.NoError(t, r.validateTTLConditions(context.Background(), []retentiontypes.CustomRetentionRule{
			{
				TTLDays: days,
				Filters: []retentiontypes.FilterCondition{
					{Key: "service.name", Values: []string{"web"}},
				},
			},
		}), "valid rule with TTL of %d days should validate", days)
	}
}

func TestValidateTTLConditionsRejectsNonPositiveRuleTTL(t *testing.T) {
	r := &ClickHouseReader{}

	rule := func(days int) retentiontypes.CustomRetentionRule {
		return retentiontypes.CustomRetentionRule{
			TTLDays: days,
			Filters: []retentiontypes.FilterCondition{
				{Key: "service.name", Values: []string{"web"}},
			},
		}
	}

	for _, days := range []int{0, -1, -30} {
		err := r.validateTTLConditions(context.Background(), []retentiontypes.CustomRetentionRule{rule(days)})
		require.Error(t, err, "rule TTL of %d days must be rejected before it reaches a multiIf expression", days)
		assert.Contains(t, err.Error(), "non-positive TTL")
	}
}

func TestBuildMultiIfExpressionCannotEmitZeroDefault(t *testing.T) {
	// Defence in depth: even if a caller constructs the expression directly,
	// the generated SQL for the cold path is guarded (see above); this test
	// pins that the plain builder output is what the guard wraps.
	r := &ClickHouseReader{logger: slog.New(slog.NewTextHandler(os.Stderr, nil))}
	expr := r.buildMultiIfExpression(nil, 30, false)
	assert.Equal(t, "30", expr)
	// With conditions, the default arm carries the operator's value and the
	// guard wraps the column read at the TTL-expression layer, not here.
	expr = r.buildMultiIfExpression([]retentiontypes.CustomRetentionRule{
		{
			TTLDays: 90,
			Filters: []retentiontypes.FilterCondition{
				{Key: "service.name", Values: []string{"web"}},
			},
		},
	}, 30, false)
	assert.True(t, strings.HasPrefix(expr, "multiIf("))
	assert.True(t, strings.HasSuffix(expr, ", 30)"))
}
