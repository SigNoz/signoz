package querybuilder

import "testing"

func TestToNanoSecs(t *testing.T) {
	tests := []struct {
		name     string
		epoch    uint64
		expected uint64
	}{
		{
			name:     "10-digit Unix timestamp (seconds) - 2023-01-01 00:00:00 UTC",
			epoch:    1672531200,          // January 1, 2023 00:00:00 UTC
			expected: 1672531200000000000, // 1672531200 * 10^9
		},
		{
			name:     "13-digit Unix timestamp (milliseconds) - 2023-01-01 00:00:00 UTC",
			epoch:    1672531200000,       // January 1, 2023 00:00:00.000 UTC
			expected: 1672531200000000000, // 1672531200000 * 10^6
		},
		{
			name:     "16-digit Unix timestamp (microseconds) - 2023-01-01 00:00:00 UTC",
			epoch:    1672531200000000,    // January 1, 2023 00:00:00.000000 UTC
			expected: 1672531200000000000, // 1672531200000000 * 10^3
		},
		{
			name:     "19-digit Unix timestamp (nanoseconds) - 2023-01-01 00:00:00 UTC",
			epoch:    1672531200000000000, // January 1, 2023 00:00:00.000000000 UTC
			expected: 1672531200000000000, // 1672531200000000000 * 10^0
		},
		{
			name:     "Unix epoch start - 1970-01-01 00:00:00 UTC",
			epoch:    0,
			expected: 0,
		},
		{
			name:     "Recent timestamp - 2024-05-25 12:00:00 UTC",
			epoch:    1716638400,          // May 25, 2024 12:00:00 UTC
			expected: 1716638400000000000, // 1716638400 * 10^9
		},

		{
			name:     "Large valid timestamp - 2025-05-15 10:30:45 UTC",
			epoch:    1747204245,          // May 15, 2025 10:30:45 UTC
			expected: 1747204245000000000, // 1747204245 * 10^9
		},
		{
			name:     "18-digit microsecond timestamp",
			epoch:    1672531200123456,    // Jan 1, 2023 with microseconds
			expected: 1672531200123456000, // 1672531200123456 * 10^3
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ToNanoSecs(tt.epoch)
			if result != tt.expected {
				t.Errorf("ToNanoSecs(%d) = %d, want %d", tt.epoch, result, tt.expected)
			}
		})
	}
}

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
