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

func TestComputeRuleMuteSources(t *testing.T) {
	now := time.Date(2026, 10, 7, 10, 0, 0, 0, time.UTC)
	ruleID := "0199a1b2-0000-7000-8000-000000000001"

	schedule := func(id string, origin alertmanagertypes.MaintenanceOrigin, name string, ruleIDs []string, start, end time.Time) *alertmanagertypes.PlannedMaintenance {
		return &alertmanagertypes.PlannedMaintenance{
			ID:       valuer.MustNewUUID(id),
			Name:     name,
			Origin:   origin,
			RuleIDs:  ruleIDs,
			Schedule: &alertmanagertypes.Schedule{Timezone: "UTC", StartTime: start, EndTime: end},
		}
	}

	adhocID := "0199a1b2-0000-7000-8000-00000000000a"
	windowID := "0199a1b2-0000-7000-8000-00000000000b"

	testCases := []struct {
		name        string
		schedules   []*alertmanagertypes.PlannedMaintenance
		wantMuted   bool
		wantSources []RuleMuteSource
	}{
		{name: "NoSchedules_NotMuted", schedules: nil, wantMuted: false},
		{
			name:        "ActiveAdhoc_MutedWithSource",
			schedules:   []*alertmanagertypes.PlannedMaintenance{schedule(adhocID, alertmanagertypes.MaintenanceOriginAdhoc, "Mute: cpu", []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted:   true,
			wantSources: []RuleMuteSource{{ID: valuer.MustNewUUID(adhocID), Name: "Mute: cpu", Origin: alertmanagertypes.MaintenanceOriginAdhoc, EndTime: now.Add(time.Hour)}},
		},
		{
			name:        "IndefiniteAdhoc_MutedWithZeroEndTime",
			schedules:   []*alertmanagertypes.PlannedMaintenance{schedule(adhocID, alertmanagertypes.MaintenanceOriginAdhoc, "Mute: mem", []string{ruleID}, now.Add(-time.Hour), time.Time{})},
			wantMuted:   true,
			wantSources: []RuleMuteSource{{ID: valuer.MustNewUUID(adhocID), Name: "Mute: mem", Origin: alertmanagertypes.MaintenanceOriginAdhoc}},
		},
		{
			name:      "ExpiredAdhoc_NotMutedNoSources",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(adhocID, alertmanagertypes.MaintenanceOriginAdhoc, "Mute: disk", []string{ruleID}, now.Add(-2*time.Hour), now.Add(-time.Hour))},
			wantMuted: false,
		},
		{
			name:        "ActiveMaintenanceWindow_NotMutedButListed",
			schedules:   []*alertmanagertypes.PlannedMaintenance{schedule(windowID, alertmanagertypes.MaintenanceOriginMaintenance, "weekend window", []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted:   false,
			wantSources: []RuleMuteSource{{ID: valuer.MustNewUUID(windowID), Name: "weekend window", Origin: alertmanagertypes.MaintenanceOriginMaintenance, EndTime: now.Add(time.Hour)}},
		},
		{
			name:      "OtherRulesSchedule_NotListed",
			schedules: []*alertmanagertypes.PlannedMaintenance{schedule(adhocID, alertmanagertypes.MaintenanceOriginAdhoc, "Mute: other", []string{"0199a1b2-0000-7000-8000-000000000002"}, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted: false,
		},
		{
			name:        "EmptyRuleIDsWindow_AppliesToAllRules",
			schedules:   []*alertmanagertypes.PlannedMaintenance{schedule(windowID, alertmanagertypes.MaintenanceOriginMaintenance, "global freeze", nil, now.Add(-time.Hour), now.Add(time.Hour))},
			wantMuted:   false,
			wantSources: []RuleMuteSource{{ID: valuer.MustNewUUID(windowID), Name: "global freeze", Origin: alertmanagertypes.MaintenanceOriginMaintenance, EndTime: now.Add(time.Hour)}},
		},
		{
			name: "AdhocAndWindowBothActive_MutedWithBothSources",
			schedules: []*alertmanagertypes.PlannedMaintenance{
				schedule(adhocID, alertmanagertypes.MaintenanceOriginAdhoc, "Mute: api", []string{ruleID}, now.Add(-time.Hour), now.Add(time.Hour)),
				schedule(windowID, alertmanagertypes.MaintenanceOriginMaintenance, "deploy window", []string{ruleID}, now.Add(-time.Hour), now.Add(2*time.Hour)),
			},
			wantMuted: true,
			wantSources: []RuleMuteSource{
				{ID: valuer.MustNewUUID(adhocID), Name: "Mute: api", Origin: alertmanagertypes.MaintenanceOriginAdhoc, EndTime: now.Add(time.Hour)},
				{ID: valuer.MustNewUUID(windowID), Name: "deploy window", Origin: alertmanagertypes.MaintenanceOriginMaintenance, EndTime: now.Add(2 * time.Hour)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			muted, sources := ComputeRuleMuteSources(ruleID, testCase.schedules, now)
			assert.Equal(t, testCase.wantMuted, muted)
			assert.Equal(t, testCase.wantSources, sources)
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
	require.Len(t, mutedRule.MutedBy, 1)
	assert.Equal(t, "Mute: cpu", mutedRule.MutedBy[0].Name)
	assert.False(t, otherRule.Muted)
	assert.Empty(t, otherRule.MutedBy)
}
