package implretention

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestBuildSlicesFromRows(t *testing.T) {
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
		slices, err := buildSlicesFromRows(
			[]*retentiontypes.TTLSetting{
				ttlSetting(t, start.Add(-time.Hour), 45, []retentiontypes.CustomRetentionRule{ruleA}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.Slice{{
			StartMs:     start.UnixMilli(),
			EndMs:       end.UnixMilli(),
			Rules:       []retentiontypes.CustomRetentionRule{ruleA},
			DefaultDays: 45,
		}}, slices)
	})

	t.Run("row inside window splits slices", func(t *testing.T) {
		firstChange := start.Add(6 * time.Hour)
		secondChange := start.Add(18 * time.Hour)

		slices, err := buildSlicesFromRows(
			[]*retentiontypes.TTLSetting{
				ttlSetting(t, firstChange, 21, []retentiontypes.CustomRetentionRule{ruleA}),
				ttlSetting(t, secondChange, 14, []retentiontypes.CustomRetentionRule{ruleB}),
			},
			30,
			start.UnixMilli(),
			end.UnixMilli(),
		)
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.Slice{
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
		}, slices)
	})

	t.Run("no rows uses fallback", func(t *testing.T) {
		slices, err := buildSlicesFromRows(nil, 30, start.UnixMilli(), end.UnixMilli())
		require.NoError(t, err)
		require.Equal(t, []retentiontypes.Slice{{
			StartMs:     start.UnixMilli(),
			EndMs:       end.UnixMilli(),
			DefaultDays: 30,
		}}, slices)
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

type noopStore struct{}

func (noopStore) ListTTLSettings(context.Context, valuer.UUID, string, int64) ([]*retentiontypes.TTLSetting, error) {
	return nil, nil
}
