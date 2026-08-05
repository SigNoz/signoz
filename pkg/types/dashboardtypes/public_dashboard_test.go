package dashboardtypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPublicDashboardResolveTimeRange(t *testing.T) {
	t.Run("returns the explicit range when time range is enabled", func(t *testing.T) {
		cases := []struct {
			description   string
			startTimeRaw  string
			endTimeRaw    string
			expectedStart uint64
			expectedEnd   uint64
		}{
			{
				description:   "valid epoch millis",
				startTimeRaw:  "1700000000000",
				endTimeRaw:    "1700000600000",
				expectedStart: 1700000000000,
				expectedEnd:   1700000600000,
			},
			{
				description:   "zero start is allowed",
				startTimeRaw:  "0",
				endTimeRaw:    "1700000600000",
				expectedStart: 0,
				expectedEnd:   1700000600000,
			},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				publicDashboard := &PublicDashboard{TimeRangeEnabled: true}

				startTime, endTime, err := publicDashboard.ResolveTimeRange(tc.startTimeRaw, tc.endTimeRaw)
				require.NoError(t, err)
				assert.Equal(t, tc.expectedStart, startTime)
				assert.Equal(t, tc.expectedEnd, endTime)
			})
		}
	})

	t.Run("rejects an invalid explicit range when time range is enabled", func(t *testing.T) {
		cases := []struct {
			description  string
			startTimeRaw string
			endTimeRaw   string
		}{
			{description: "non-numeric startTime", startTimeRaw: "abc", endTimeRaw: "1700000600000"},
			{description: "empty startTime", startTimeRaw: "", endTimeRaw: "1700000600000"},
			{description: "negative startTime", startTimeRaw: "-1", endTimeRaw: "1700000600000"},
			{description: "non-numeric endTime", startTimeRaw: "1700000000000", endTimeRaw: "xyz"},
			{description: "empty endTime", startTimeRaw: "1700000000000", endTimeRaw: ""},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				publicDashboard := &PublicDashboard{TimeRangeEnabled: true}

				_, _, err := publicDashboard.ResolveTimeRange(tc.startTimeRaw, tc.endTimeRaw)
				assert.Error(t, err)
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			})
		}
	})

	t.Run("derives the range from now and the default when time range is disabled", func(t *testing.T) {
		cases := []struct {
			description      string
			defaultTimeRange string
			expectedWidthMS  uint64
		}{
			{description: "one hour", defaultTimeRange: "1h", expectedWidthMS: uint64(time.Hour.Milliseconds())},
			{description: "thirty minutes", defaultTimeRange: "30m", expectedWidthMS: uint64((30 * time.Minute).Milliseconds())},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				publicDashboard := &PublicDashboard{TimeRangeEnabled: false, DefaultTimeRange: tc.defaultTimeRange}

				before := uint64(time.Now().UnixMilli())
				startTime, endTime, err := publicDashboard.ResolveTimeRange("ignored", "ignored")
				after := uint64(time.Now().UnixMilli())

				require.NoError(t, err)
				// end is "now"; both bounds share the same instant, so the width is exact.
				assert.GreaterOrEqual(t, endTime, before)
				assert.LessOrEqual(t, endTime, after)
				assert.Equal(t, tc.expectedWidthMS, endTime-startTime)
			})
		}
	})

	t.Run("ignores caller-supplied bounds when time range is disabled", func(t *testing.T) {
		publicDashboard := &PublicDashboard{TimeRangeEnabled: false, DefaultTimeRange: "1h"}

		startTime, endTime, err := publicDashboard.ResolveTimeRange("123", "456")
		require.NoError(t, err)
		assert.NotEqual(t, uint64(123), startTime)
		assert.NotEqual(t, uint64(456), endTime)
		assert.Equal(t, uint64(time.Hour.Milliseconds()), endTime-startTime)
	})

	t.Run("returns an internal error for an unparseable stored default range", func(t *testing.T) {
		publicDashboard := &PublicDashboard{TimeRangeEnabled: false, DefaultTimeRange: "not-a-duration"}

		_, _, err := publicDashboard.ResolveTimeRange("", "")
		assert.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeInternal))
	})
}
