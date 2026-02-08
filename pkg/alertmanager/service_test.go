package alertmanager

import (
	"context"
	"math"
	"sync"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testMuter implements amtypes.Muter for testing.
type testMuter struct {
	mu       sync.Mutex
	muteFunc func(model.LabelSet) bool
	calls    []model.LabelSet
}

func (m *testMuter) Mutes(labels model.LabelSet) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = append(m.calls, labels)
	if m.muteFunc != nil {
		return m.muteFunc(labels)
	}
	return false
}

func (m *testMuter) getCalls() []model.LabelSet {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]model.LabelSet, len(m.calls))
	copy(result, m.calls)
	return result
}

// fakeStateHistoryStore captures calls for assertion.
type fakeStateHistoryStore struct {
	written   []alertmanagertypes.RuleStateHistory
	lastErr   error
	getResult []alertmanagertypes.RuleStateHistory
	getErr    error

	// Stats method returns
	totalTriggers          uint64
	totalTriggersErr       error
	triggersSeries         *alertmanagertypes.Series
	triggersSeriesErr      error
	avgResolutionTime      float64
	avgResolutionTimeErr   error
	avgResTimeSeries       *alertmanagertypes.Series
	avgResTimeSeriesErr    error

	// Captures params passed to stats methods
	statsCalls []*alertmanagertypes.QueryRuleStateHistory
}

func (w *fakeStateHistoryStore) WriteRuleStateHistory(_ context.Context, entries []alertmanagertypes.RuleStateHistory) error {
	w.written = append(w.written, entries...)
	return w.lastErr
}

func (w *fakeStateHistoryStore) GetLastSavedRuleStateHistory(_ context.Context, _ string) ([]alertmanagertypes.RuleStateHistory, error) {
	return w.getResult, w.getErr
}

func (w *fakeStateHistoryStore) GetRuleStateHistoryTimeline(_ context.Context, _ string, _ string, _ *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.RuleStateTimeline, error) {
	return nil, nil
}

func (w *fakeStateHistoryStore) GetRuleStateHistoryTopContributors(_ context.Context, _ string, _ string, _ *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateHistoryContributor, error) {
	return nil, nil
}

func (w *fakeStateHistoryStore) GetOverallStateTransitions(_ context.Context, _ string, _ string, _ *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateTransition, error) {
	return nil, nil
}

func (w *fakeStateHistoryStore) GetTotalTriggers(_ context.Context, _ string, _ string, params *alertmanagertypes.QueryRuleStateHistory) (uint64, error) {
	w.statsCalls = append(w.statsCalls, params)
	return w.totalTriggers, w.totalTriggersErr
}

func (w *fakeStateHistoryStore) GetTriggersByInterval(_ context.Context, _ string, _ string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.Series, error) {
	w.statsCalls = append(w.statsCalls, params)
	return w.triggersSeries, w.triggersSeriesErr
}

func (w *fakeStateHistoryStore) GetAvgResolutionTime(_ context.Context, _ string, _ string, params *alertmanagertypes.QueryRuleStateHistory) (float64, error) {
	w.statsCalls = append(w.statsCalls, params)
	return w.avgResolutionTime, w.avgResolutionTimeErr
}

func (w *fakeStateHistoryStore) GetAvgResolutionTimeByInterval(_ context.Context, _ string, _ string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.Series, error) {
	w.statsCalls = append(w.statsCalls, params)
	return w.avgResTimeSeries, w.avgResTimeSeriesErr
}

func TestLabelsFromJSON(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  model.LabelSet
	}{
		{
			name:  "empty string",
			input: "",
			want:  nil,
		},
		{
			name:  "invalid json",
			input: "not json",
			want:  nil,
		},
		{
			name:  "valid labels",
			input: `{"env":"prod","severity":"critical"}`,
			want: model.LabelSet{
				"env":      "prod",
				"severity": "critical",
			},
		},
		{
			name:  "empty object",
			input: `{}`,
			want:  model.LabelSet{},
		},
		{
			name:  "single label",
			input: `{"alertname":"HighCPU"}`,
			want:  model.LabelSet{"alertname": "HighCPU"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := labelsFromJSON(tc.input)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestRecordRuleStateHistory(t *testing.T) {
	ctx := context.Background()

	t.Run("nil writer returns nil", func(t *testing.T) {
		svc := &Service{stateHistoryStore: nil}
		err := svc.RecordRuleStateHistory(ctx, "org-1", []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing"},
		})
		require.NoError(t, err)
	})

	t.Run("no muter writes entries unchanged", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: nil,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Labels: `{"env":"prod"}`},
			{RuleID: "r2", State: "normal", Labels: `{"env":"staging"}`},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 2)
		assert.Equal(t, "firing", writer.written[0].State)
		assert.Equal(t, "normal", writer.written[1].State)
	})

	t.Run("muter changes firing to muted when matched", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(ls model.LabelSet) bool {
				return ls["env"] == "prod"
			},
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Labels: `{"env":"prod"}`},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 1)
		assert.Equal(t, "muted", writer.written[0].State)
	})

	t.Run("muter does not change firing when not matched", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(ls model.LabelSet) bool {
				return ls["env"] == "prod"
			},
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Labels: `{"env":"staging"}`},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 1)
		assert.Equal(t, "firing", writer.written[0].State)
	})

	t.Run("muter only affects firing entries", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(model.LabelSet) bool { return true }, // mute everything
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "normal", Labels: `{"env":"prod"}`},
			{RuleID: "r2", State: "no_data", Labels: `{"env":"prod"}`},
			{RuleID: "r3", State: "firing", Labels: `{"env":"prod"}`},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 3)
		assert.Equal(t, "normal", writer.written[0].State, "normal should not be muted")
		assert.Equal(t, "no_data", writer.written[1].State, "no_data should not be muted")
		assert.Equal(t, "muted", writer.written[2].State, "firing should become muted")
	})

	t.Run("ruleId is injected into labels for muter evaluation", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(ls model.LabelSet) bool {
				return ls["ruleId"] == "target-rule"
			},
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "target-rule", State: "firing", Labels: `{"env":"prod"}`},
			{RuleID: "other-rule", State: "firing", Labels: `{"env":"prod"}`},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 2)
		assert.Equal(t, "muted", writer.written[0].State, "target-rule should be muted")
		assert.Equal(t, "firing", writer.written[1].State, "other-rule should not be muted")

		// Verify the muter received labels with ruleId injected
		calls := muter.getCalls()
		require.Len(t, calls, 2)
		assert.Equal(t, model.LabelValue("target-rule"), calls[0]["ruleId"])
		assert.Equal(t, model.LabelValue("other-rule"), calls[1]["ruleId"])
	})

	t.Run("invalid labels JSON skips muting check", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(model.LabelSet) bool { return true },
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Labels: "not-json"},
			{RuleID: "r2", State: "firing", Labels: ""},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 2)
		// Both should stay firing because labels couldn't be parsed
		assert.Equal(t, "firing", writer.written[0].State)
		assert.Equal(t, "firing", writer.written[1].State)
		// Muter should not have been called
		assert.Empty(t, muter.getCalls())
	})

	t.Run("mixed entries with selective muting", func(t *testing.T) {
		writer := &fakeStateHistoryStore{}
		muter := &testMuter{
			muteFunc: func(ls model.LabelSet) bool {
				return ls["severity"] == "warning"
			},
		}
		svc := &Service{
			stateHistoryStore:   writer,
			maintenanceExprMuter: muter,
		}

		entries := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Labels: `{"severity":"critical"}`, Fingerprint: 1},
			{RuleID: "r2", State: "firing", Labels: `{"severity":"warning"}`, Fingerprint: 2},
			{RuleID: "r3", State: "normal", Labels: `{"severity":"warning"}`, Fingerprint: 3},
			{RuleID: "r4", State: "firing", Labels: `{"severity":"warning"}`, Fingerprint: 4},
		}
		err := svc.RecordRuleStateHistory(ctx, "org-1", entries)
		require.NoError(t, err)
		require.Len(t, writer.written, 4)
		assert.Equal(t, "firing", writer.written[0].State, "critical firing stays firing")
		assert.Equal(t, "muted", writer.written[1].State, "warning firing becomes muted")
		assert.Equal(t, "normal", writer.written[2].State, "normal is never muted")
		assert.Equal(t, "muted", writer.written[3].State, "warning firing becomes muted")
	})
}

func TestGetLastSavedRuleStateHistory(t *testing.T) {
	ctx := context.Background()

	t.Run("nil writer returns nil", func(t *testing.T) {
		svc := &Service{stateHistoryStore: nil}
		result, err := svc.GetLastSavedRuleStateHistory(ctx, "r1")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("delegates to writer", func(t *testing.T) {
		expected := []alertmanagertypes.RuleStateHistory{
			{RuleID: "r1", State: "firing", Fingerprint: 123},
		}
		writer := &fakeStateHistoryStore{getResult: expected}
		svc := &Service{stateHistoryStore: writer}

		result, err := svc.GetLastSavedRuleStateHistory(ctx, "r1")
		require.NoError(t, err)
		assert.Equal(t, expected, result)
	})
}

func TestGetRuleStats(t *testing.T) {
	ctx := context.Background()

	t.Run("aggregates current and past period stats", func(t *testing.T) {
		currentSeries := &alertmanagertypes.Series{Points: []alertmanagertypes.Point{{Timestamp: 1000, Value: 5}}}
		currentResSeries := &alertmanagertypes.Series{Points: []alertmanagertypes.Point{{Timestamp: 1000, Value: 120}}}
		store := &fakeStateHistoryStore{
			totalTriggers:     10,
			triggersSeries:    currentSeries,
			avgResolutionTime: 300.5,
			avgResTimeSeries:  currentResSeries,
		}
		svc := &Service{stateHistoryStore: store}

		params := &alertmanagertypes.QueryRuleStateHistory{
			Start: 1000,
			End:   90000000, // ~1 day
		}
		result, err := svc.GetRuleStats(ctx, "org-1", "rule-1", params)
		require.NoError(t, err)

		assert.Equal(t, uint64(10), result.TotalCurrentTriggers)
		assert.Equal(t, uint64(10), result.TotalPastTriggers)
		assert.Equal(t, currentSeries, result.CurrentTriggersSeries)
		assert.Equal(t, 300.5, result.CurrentAvgResolutionTime)
	})

	t.Run("period shifting for duration >= 1 day", func(t *testing.T) {
		store := &fakeStateHistoryStore{}
		svc := &Service{stateHistoryStore: store}

		// 2-day window: Start=0, End=172800000 (2 days in millis)
		params := &alertmanagertypes.QueryRuleStateHistory{
			Start: 0,
			End:   172800000,
		}
		_, err := svc.GetRuleStats(ctx, "org-1", "rule-1", params)
		require.NoError(t, err)

		// First 4 calls are current period, next 4 are past period.
		// For 2 days: ceil(172800000/86400000) = 2, shift = 2*86400000 = 172800000
		require.GreaterOrEqual(t, len(store.statsCalls), 8)
		pastParams := store.statsCalls[4] // first past period call
		assert.Equal(t, int64(-172800000), pastParams.Start)
		assert.Equal(t, int64(0), pastParams.End)
	})

	t.Run("period shifting for duration < 1 day", func(t *testing.T) {
		store := &fakeStateHistoryStore{}
		svc := &Service{stateHistoryStore: store}

		// 1-hour window
		params := &alertmanagertypes.QueryRuleStateHistory{
			Start: 100000000,
			End:   103600000, // 3600000ms = 1 hour
		}
		_, err := svc.GetRuleStats(ctx, "org-1", "rule-1", params)
		require.NoError(t, err)

		// For < 1 day: shift by exactly 1 day (86400000ms)
		require.GreaterOrEqual(t, len(store.statsCalls), 8)
		pastParams := store.statsCalls[4]
		assert.Equal(t, int64(100000000-86400000), pastParams.Start)
		assert.Equal(t, int64(103600000-86400000), pastParams.End)
	})

	t.Run("NaN and Inf avg resolution times are zeroed", func(t *testing.T) {
		for _, val := range []float64{math.NaN(), math.Inf(1), math.Inf(-1)} {
			store := &fakeStateHistoryStore{
				avgResolutionTime: val,
			}
			svc := &Service{stateHistoryStore: store}

			result, err := svc.GetRuleStats(ctx, "org-1", "rule-1", &alertmanagertypes.QueryRuleStateHistory{
				Start: 0, End: 100000000,
			})
			require.NoError(t, err)
			assert.Equal(t, float64(0), result.CurrentAvgResolutionTime)
			assert.Equal(t, float64(0), result.PastAvgResolutionTime)
		}
	})
}

