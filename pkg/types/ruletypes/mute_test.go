package ruletypes

import (
	"testing"
	"time"

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
