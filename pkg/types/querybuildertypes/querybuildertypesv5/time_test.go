package querybuildertypesv5

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestToMilliSecs(t *testing.T) {
	testCases := []struct {
		name     string
		epoch    uint64
		expected uint64
	}{
		{
			name:     "SecondsEpoch_TenDigits_ScaledUp",
			epoch:    1672531200,    // seconds, 2023-01-01 00:00:00 UTC
			expected: 1672531200000, // * 10^3
		},
		{
			name:     "MilliSecondsEpoch_ThirteenDigits_Unchanged",
			epoch:    1672531200000,
			expected: 1672531200000, // unchanged
		},
		{
			name:     "MicroSecondsEpoch_SixteenDigits_ScaledDown",
			epoch:    1672531200000000, // microseconds
			expected: 1672531200000,    // / 10^3
		},
		{
			name:     "NanoSecondsEpoch_NineteenDigits_ScaledDown",
			epoch:    1672531200000000000, // nanoseconds
			expected: 1672531200000,       // / 10^6
		},
		{
			name:     "Zero_Unchanged",
			epoch:    0,
			expected: 0,
		},
		{
			name:     "SecondsEpoch_RecentTimestamp_ScaledUp",
			epoch:    1716638400, // 2024-05-25 12:00:00 UTC
			expected: 1716638400000,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, ToMilliSecs(testCase.epoch))
		})
	}
}
