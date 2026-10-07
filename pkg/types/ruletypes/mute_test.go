package ruletypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveEndTime(t *testing.T) {
	now := time.Date(2026, 10, 6, 10, 0, 0, 0, time.UTC)

	testCases := []struct {
		name    string
		mute    PostableRuleMute
		wantEnd time.Time
		wantErr string
	}{
		{name: "EmptyBody_IndefiniteZeroEnd", mute: PostableRuleMute{}, wantEnd: time.Time{}},
		{name: "Duration_AddedToNow", mute: PostableRuleMute{Duration: valuer.MustParseTextDuration("4h")}, wantEnd: now.Add(4 * time.Hour)},
		{name: "EndTime_UsedAsIs", mute: PostableRuleMute{EndTime: now.Add(time.Hour)}, wantEnd: now.Add(time.Hour)},
		{name: "DurationAndEndTime_Rejected", mute: PostableRuleMute{Duration: valuer.MustParseTextDuration("1h"), EndTime: now.Add(time.Hour)}, wantErr: "mutually exclusive"},
		{name: "PastEndTime_Rejected", mute: PostableRuleMute{EndTime: now.Add(-time.Minute)}, wantErr: "must be in the future"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			end, err := testCase.mute.ResolveEndTime(now)
			if testCase.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.wantErr)
				return
			}
			require.NoError(t, err)
			assert.True(t, end.Equal(testCase.wantEnd), "end = %v, want %v", end, testCase.wantEnd)
		})
	}
}

func TestComputeRuleMuted(t *testing.T) {
	now := time.Date(2026, 10, 7, 10, 0, 0, 0, time.UTC)
	ruleID := "0199a1b2-0000-7000-8000-000000000001"

	schedule := func(origin alertmanagertypes.MaintenanceOrigin, ruleIDs []string, start, end time.Time) *alertmanagertypes.PlannedMaintenance {
		return &alertmanagertypes.PlannedMaintenance{
			ID:       valuer.GenerateUUID(),
			Origin:   origin,
			RuleIDs:  ruleIDs,
			Schedule: &alertmanagertypes.Schedule{Timezone: "UTC", StartTime: start, EndTime: end},
		}
	}

	testCases := []struct {
		name      string
		schedules []*alertmanagertypes.PlannedMaintenance
		wantMuted bool
	}{
		{name: "NoSchedules_NotMuted", schedules: nil, wantMuted: false},
		{
			name:      "ActiveAdhoc_Muted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginAdhoc, []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted: true,
		},
		{
			name:      "IndefiniteAdhoc_Muted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginAdhoc, []string{ruleID}, now.Add(-time.Hour), time.Time{})},
			wantMuted: true,
		},
		{
			name:      "ExpiredAdhoc_NotMuted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginAdhoc, []string{ruleID}, now.Add(-2*time.Hour), now.Add(-time.Hour))},
			wantMuted: false,
		},
		{
			name:      "ActiveMaintenanceWindow_NotMuted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginMaintenance, []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted: false,
		},
		{
			name:      "OtherRulesAdhoc_NotMuted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginAdhoc, []string{"0199a1b2-0000-7000-8000-000000000002"}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted: false,
		},
		{
			name:      "GlobalMaintenanceWindow_NotMuted",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(alertmanagertypes.MaintenanceOriginMaintenance, nil, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted: false,
		},
		{
			name: "AdhocAndWindowBothActive_Muted",
			schedules: []*alertmanagertypes.PlannedMaintenance{
				schedule(alertmanagertypes.MaintenanceOriginMaintenance, []string{ruleID}, now.Add(-time.Hour), now.Add(2*time.Hour)),
				schedule(alertmanagertypes.MaintenanceOriginAdhoc, []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour)),
			},
			wantMuted: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantMuted, ComputeRuleMuted(ruleID, testCase.schedules, now))
		})
	}
}

func TestOverlayRuleMutes(t *testing.T) {
	now := time.Date(2026, 10, 7, 10, 0, 0, 0, time.UTC)
	mutedRule := &ListableRule{Id: "0199a1b2-0000-7000-8000-000000000001"}
	otherRule := &ListableRule{Id: "0199a1b2-0000-7000-8000-000000000002"}
	schedules := []*alertmanagertypes.PlannedMaintenance{{
		ID:       valuer.MustNewUUID("0199a1b2-0000-7000-8000-00000000000a"),
		Name:     "Mute: cpu",
		Origin:   alertmanagertypes.MaintenanceOriginAdhoc,
		RuleIDs:  []string{mutedRule.Id},
		Schedule: &alertmanagertypes.Schedule{Timezone: "UTC", StartTime: now.Add(-time.Hour), EndTime: now.Add(time.Hour)},
	}}

	OverlayRuleMutes([]*ListableRule{mutedRule, otherRule}, schedules, now)

	assert.True(t, mutedRule.Muted)
	assert.False(t, otherRule.Muted)
}
