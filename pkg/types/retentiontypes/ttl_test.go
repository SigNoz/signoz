package retentiontypes

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/stretchr/testify/require"
)

func TestBuildRetentionPolicySegmentsFromRows(t *testing.T) {
	start := time.Date(2026, 5, 4, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 1)

	ruleA := CustomRetentionRule{
		Filters: []FilterCondition{{Key: "service.name", Values: []string{"api"}}},
		TTLDays: 7,
	}
	ruleB := CustomRetentionRule{
		Filters: []FilterCondition{{Key: "env", Values: []string{"prod"}}},
		TTLDays: 15,
	}

	t.Run("row before window is active at start", func(t *testing.T) {
		segments, err := BuildRetentionPolicySegmentsFromRows(
			[]*TTLSetting{
				ttlSetting(t, start.Add(-time.Hour), 45, []CustomRetentionRule{ruleA}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []*RetentionPolicySegment{
			NewRetentionPolicySegment(start.UnixMilli(), end.UnixMilli(), []CustomRetentionRule{ruleA}, 45),
		}, segments)
	})

	t.Run("row inside window splits segments", func(t *testing.T) {
		firstChange := start.Add(6 * time.Hour)
		secondChange := start.Add(18 * time.Hour)

		segments, err := BuildRetentionPolicySegmentsFromRows(
			[]*TTLSetting{
				ttlSetting(t, firstChange, 21, []CustomRetentionRule{ruleA}),
				ttlSetting(t, secondChange, 14, []CustomRetentionRule{ruleB}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []*RetentionPolicySegment{
			NewRetentionPolicySegment(start.UnixMilli(), firstChange.UnixMilli(), nil, 30),
			NewRetentionPolicySegment(firstChange.UnixMilli(), secondChange.UnixMilli(), []CustomRetentionRule{ruleA}, 21),
			NewRetentionPolicySegment(secondChange.UnixMilli(), end.UnixMilli(), []CustomRetentionRule{ruleB}, 14),
		}, segments)
	})

	t.Run("no rows uses fallback", func(t *testing.T) {
		segments, err := BuildRetentionPolicySegmentsFromRows(nil, 30, start.UnixMilli(), end.UnixMilli())
		require.NoError(t, err)
		require.Equal(t, []*RetentionPolicySegment{
			NewRetentionPolicySegment(start.UnixMilli(), end.UnixMilli(), nil, 30),
		}, segments)
	})
}

func ttlSetting(t *testing.T, createdAt time.Time, ttlDays int, rules []CustomRetentionRule) *TTLSetting {
	t.Helper()

	condition, err := json.Marshal(rules)
	require.NoError(t, err)

	return &TTLSetting{
		TimeAuditable: types.TimeAuditable{
			CreatedAt: createdAt,
		},
		TTL:       ttlDays,
		Condition: string(condition),
	}
}
