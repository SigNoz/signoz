package querybuildertypesv5

import "testing"

func TestToMilliSecs(t *testing.T) {
	tests := []struct {
		name     string
		epoch    uint64
		expected uint64
	}{
		{
			name:     "10-digit Unix timestamp (seconds) - 2023-01-01 00:00:00 UTC",
			epoch:    1672531200,    // seconds
			expected: 1672531200000, // * 10^3
		},
		{
			name:     "13-digit Unix timestamp (milliseconds) - already ms",
			epoch:    1672531200000,
			expected: 1672531200000, // unchanged
		},
		{
			name:     "16-digit Unix timestamp (microseconds)",
			epoch:    1672531200000000, // microseconds
			expected: 1672531200000,    // / 10^3
		},
		{
			name:     "19-digit Unix timestamp (nanoseconds)",
			epoch:    1672531200000000000, // nanoseconds
			expected: 1672531200000,       // / 10^6
		},
		{
			name:     "Unix epoch start - zero is unchanged",
			epoch:    0,
			expected: 0,
		},
		{
			name:     "Recent timestamp in seconds - 2024-05-25 12:00:00 UTC",
			epoch:    1716638400,
			expected: 1716638400000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ToMilliSecs(tt.epoch)
			if result != tt.expected {
				t.Errorf("ToMilliSecs(%d) = %d, want %d", tt.epoch, result, tt.expected)
			}
		})
	}
}
