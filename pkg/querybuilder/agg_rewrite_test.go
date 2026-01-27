package querybuilder

import (
	"testing"
)

func TestParseDistributionBucketCount(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected int
		wantErr  bool
	}{
		{
			name:     "simple",
			expr:     "distribution(duration_nano,4)",
			expected: 4,
			wantErr:  false,
		},
		{
			name:     "with spaces",
			expr:     "distribution( http.request.duration , 120 )",
			expected: 120,
			wantErr:  false,
		},
		{
			name:     "no comma",
			expr:     "distribution(duration_nano)",
			expected: 0,
			wantErr:  true,
		},
		{
			name:     "invalid number",
			expr:     "distribution(duration_nano, abc)",
			expected: 0,
			wantErr:  true,
		},
		{
			name:     "user case A",
			expr:     "distribution(duration_nano,4)",
			expected: 4,
			wantErr:  false,
		},
		{
			name:     "user case B",
			expr:     "distribution(http.request.duration,120)",
			expected: 120,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseHeatmapBucketCount(tt.expr)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseHeatmapBucketCount() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.expected {
				t.Errorf("ParseHeatmapBucketCount() = %v, want %v", got, tt.expected)
			}
		})
	}
}
