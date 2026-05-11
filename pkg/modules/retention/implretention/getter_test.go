package implretention

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/stretchr/testify/require"
)

func TestBuildRetentionPolicySegmentsFromRows(t *testing.T) {
	start := time.Date(2026, 5, 4, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 1)

	ruleA := retentiontypes.CustomRetentionRule{
		Filters: []retentiontypes.FilterCondition{{Key: "service.name", Values: []string{"api"}}},
		TTLDays: 7,
	}
	ruleB := retentiontypes.CustomRetentionRule{
		Filters: []retentiontypes.FilterCondition{{Key: "env", Values: []string{"prod"}}},
		TTLDays: 15,
	}

	t.Run("row before window is active at start", func(t *testing.T) {
		segments, err := buildRetentionPolicySegmentsFromRows(
			[]*retentiontypes.TTLSetting{
				ttlSetting(t, start.Add(-time.Hour), 45, []retentiontypes.CustomRetentionRule{ruleA}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.RetentionPolicySegment{{
			StartMs:     start.UnixMilli(),
			EndMs:       end.UnixMilli(),
			Rules:       []retentiontypes.CustomRetentionRule{ruleA},
			DefaultDays: 45,
		}}, segments)
	})

	t.Run("row inside window splits segments", func(t *testing.T) {
		firstChange := start.Add(6 * time.Hour)
		secondChange := start.Add(18 * time.Hour)

		segments, err := buildRetentionPolicySegmentsFromRows(
			[]*retentiontypes.TTLSetting{
				ttlSetting(t, firstChange, 21, []retentiontypes.CustomRetentionRule{ruleA}),
				ttlSetting(t, secondChange, 14, []retentiontypes.CustomRetentionRule{ruleB}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.RetentionPolicySegment{
			{
				StartMs:     start.UnixMilli(),
				EndMs:       firstChange.UnixMilli(),
				DefaultDays: 30,
			},
			{
				StartMs:     firstChange.UnixMilli(),
				EndMs:       secondChange.UnixMilli(),
				Rules:       []retentiontypes.CustomRetentionRule{ruleA},
				DefaultDays: 21,
			},
			{
				StartMs:     secondChange.UnixMilli(),
				EndMs:       end.UnixMilli(),
				Rules:       []retentiontypes.CustomRetentionRule{ruleB},
				DefaultDays: 14,
			},
		}, segments)
	})

	t.Run("no rows uses fallback", func(t *testing.T) {
		segments, err := buildRetentionPolicySegmentsFromRows(nil, 30, start.UnixMilli(), end.UnixMilli())
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.RetentionPolicySegment{{
			StartMs:     start.UnixMilli(),
			EndMs:       end.UnixMilli(),
			DefaultDays: 30,
		}}, segments)
	})
}

func ttlSetting(t *testing.T, createdAt time.Time, ttlDays int, rules []retentiontypes.CustomRetentionRule) *retentiontypes.TTLSetting {
	t.Helper()

	condition, err := json.Marshal(rules)
	require.NoError(t, err)

	return &retentiontypes.TTLSetting{
		TimeAuditable: types.TimeAuditable{
			CreatedAt: createdAt,
		},
		TTL:       ttlDays,
		Condition: string(condition),
	}
}
