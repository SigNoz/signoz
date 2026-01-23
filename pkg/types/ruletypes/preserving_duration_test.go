package ruletypes

import (
	"encoding/json"
	"testing"
	"time"
)

func TestPreservingDuration_UnmarshalJSON_String(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantDur time.Duration
		wantRaw string
		wantErr bool
	}{
		{
			name:    "standard format - 5 minutes",
			json:    `"5m"`,
			wantDur: 5 * time.Minute,
			wantRaw: "5m",
		},
		{
			name:    "standard format - 1 hour",
			json:    `"1h"`,
			wantDur: 1 * time.Hour,
			wantRaw: "1h",
		},
		{
			name:    "standard format - 60 minutes",
			json:    `"60m"`,
			wantDur: 60 * time.Minute,
			wantRaw: "60m",
		},
		{
			name:    "complex format",
			json:    `"1h30m45s"`,
			wantDur: 1*time.Hour + 30*time.Minute + 45*time.Second,
			wantRaw: "1h30m45s",
		},
		{
			name:    "seconds only",
			json:    `"30s"`,
			wantDur: 30 * time.Second,
			wantRaw: "30s",
		},
		{
			name:    "invalid string format",
			json:    `"invalid"`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var pd PreservingDuration
			err := json.Unmarshal([]byte(tt.json), &pd)

			if (err != nil) != tt.wantErr {
				t.Errorf("UnmarshalJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				return
			}

			if pd.Duration() != tt.wantDur {
				t.Errorf("Duration() = %v, want %v", pd.Duration(), tt.wantDur)
			}

			if pd.String() != tt.wantRaw {
				t.Errorf("String() = %v, want %v", pd.String(), tt.wantRaw)
			}
		})
	}
}

func TestPreservingDuration_UnmarshalJSON_Numeric(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantDur time.Duration
	}{
		{
			name:    "5 minutes as nanoseconds (int)",
			json:    `300000000000`,
			wantDur: 5 * time.Minute,
		},
		{
			name:    "1 hour as nanoseconds (int)",
			json:    `3600000000000`,
			wantDur: 1 * time.Hour,
		},
		{
			name:    "30 seconds as nanoseconds (int)",
			json:    `30000000000`,
			wantDur: 30 * time.Second,
		},
		{
			name:    "5 minutes as nanoseconds (float)",
			json:    `300000000000.0`,
			wantDur: 5 * time.Minute,
		},
		{
			name:    "zero duration",
			json:    `0`,
			wantDur: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var pd PreservingDuration
			err := json.Unmarshal([]byte(tt.json), &pd)

			if err != nil {
				t.Errorf("UnmarshalJSON() error = %v", err)
				return
			}

			if pd.Duration() != tt.wantDur {
				t.Errorf("Duration() = %v, want %v", pd.Duration(), tt.wantDur)
			}

			// When unmarshaled from numeric, raw should be the string representation
			expectedRaw := tt.wantDur.String()
			if pd.String() != expectedRaw {
				t.Errorf("String() = %v, want %v", pd.String(), expectedRaw)
			}
		})
	}
}

func TestPreservingDuration_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		duration PreservingDuration
		want     string
	}{
		{
			name:     "with original string format",
			duration: PreservingDuration{value: 5 * time.Minute, raw: "5m"},
			want:     `"5m"`,
		},
		{
			name:     "with normalized format preserved",
			duration: PreservingDuration{value: 60 * time.Minute, raw: "60m"},
			want:     `"60m"`,
		},
		{
			name:     "created from NewPreservingDuration",
			duration: NewPreservingDuration(5 * time.Minute),
			want:     `"5m0s"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.duration)
			if err != nil {
				t.Errorf("MarshalJSON() error = %v", err)
				return
			}

			if string(got) != tt.want {
				t.Errorf("MarshalJSON() = %v, want %v", string(got), tt.want)
			}
		})
	}
}

func TestPreservingDuration_RoundTrip(t *testing.T) {
	tests := []struct {
		name      string
		inputJSON string
		wantJSON  string
		wantDur   time.Duration
	}{
		{
			name:      "string format preserved",
			inputJSON: `{"duration":"5m"}`,
			wantJSON:  `{"duration":"5m"}`,
			wantDur:   5 * time.Minute,
		},
		{
			name:      "numeric format converted to string",
			inputJSON: `{"duration":300000000000}`,
			wantJSON:  `{"duration":"5m0s"}`,
			wantDur:   5 * time.Minute,
		},
		{
			name:      "60m preserved (not normalized to 1h)",
			inputJSON: `{"duration":"60m"}`,
			wantJSON:  `{"duration":"60m"}`,
			wantDur:   60 * time.Minute,
		},
	}

	type wrapper struct {
		Duration PreservingDuration `json:"duration"`
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var w wrapper
			if err := json.Unmarshal([]byte(tt.inputJSON), &w); err != nil {
				t.Errorf("Unmarshal() error = %v", err)
				return
			}

			if w.Duration.Duration() != tt.wantDur {
				t.Errorf("Duration() = %v, want %v", w.Duration.Duration(), tt.wantDur)
			}

			got, err := json.Marshal(w)
			if err != nil {
				t.Errorf("Marshal() error = %v", err)
				return
			}

			if string(got) != tt.wantJSON {
				t.Errorf("Marshal() = %v, want %v", string(got), tt.wantJSON)
			}
		})
	}
}

func TestPreservingDuration_BackwardCompatibility(t *testing.T) {
	// Test that we maintain backward compatibility with APIs that might
	// send duration as numbers (legacy behavior of time.Duration in JSON)
	type alertRule struct {
		EvalWindow PreservingDuration `json:"evalWindow"`
		Frequency  PreservingDuration `json:"frequency"`
	}

	tests := []struct {
		name      string
		inputJSON string
		wantEval  time.Duration
		wantFreq  time.Duration
	}{
		{
			name:      "both string format (new API clients)",
			inputJSON: `{"evalWindow":"5m","frequency":"1m"}`,
			wantEval:  5 * time.Minute,
			wantFreq:  1 * time.Minute,
		},
		{
			name:      "both numeric format (legacy API clients)",
			inputJSON: `{"evalWindow":300000000000,"frequency":60000000000}`,
			wantEval:  5 * time.Minute,
			wantFreq:  1 * time.Minute,
		},
		{
			name:      "mixed format (transition period)",
			inputJSON: `{"evalWindow":"5m","frequency":60000000000}`,
			wantEval:  5 * time.Minute,
			wantFreq:  1 * time.Minute,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var rule alertRule
			if err := json.Unmarshal([]byte(tt.inputJSON), &rule); err != nil {
				t.Errorf("Unmarshal() error = %v", err)
				return
			}

			if rule.EvalWindow.Duration() != tt.wantEval {
				t.Errorf("EvalWindow.Duration() = %v, want %v", rule.EvalWindow.Duration(), tt.wantEval)
			}

			if rule.Frequency.Duration() != tt.wantFreq {
				t.Errorf("Frequency.Duration() = %v, want %v", rule.Frequency.Duration(), tt.wantFreq)
			}
		})
	}
}
