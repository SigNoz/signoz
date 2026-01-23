package ruletypes

import (
	"encoding/json"
	"fmt"
	"time"
)

// PreservingDuration wraps time.Duration and preserves the original string
// representation when unmarshaling from JSON. This ensures duration values
// like "60m" are not normalized to "1h0m0s" in API responses.
type PreservingDuration struct {
	value time.Duration
	raw   string
}

// NewPreservingDuration creates a PreservingDuration from a time.Duration.
func NewPreservingDuration(d time.Duration) PreservingDuration {
	return PreservingDuration{
		value: d,
		raw:   d.String(),
	}
}

// UnmarshalJSON implements json.Unmarshaler.
// Accepts both string format ("5m", "1h") and numeric format (nanoseconds as int64/float64)
func (pd *PreservingDuration) UnmarshalJSON(b []byte) error {
	// Try unmarshaling as string first (preferred format)
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		d, err := time.ParseDuration(s)
		if err != nil {
			return fmt.Errorf("invalid duration: %w", err)
		}
		pd.value = d
		pd.raw = s
		return nil
	}

	// Fall back to numeric format (nanoseconds as int64 or float64)
	var ns float64
	if err := json.Unmarshal(b, &ns); err != nil {
		return fmt.Errorf("duration must be a string (e.g., \"5m\") or number (nanoseconds): %w", err)
	}

	pd.value = time.Duration(ns)
	pd.raw = pd.value.String() // Convert numeric to standard string format
	return nil
}

// MarshalJSON implements json.Marshaler.
func (pd PreservingDuration) MarshalJSON() ([]byte, error) {
	if pd.raw != "" {
		return json.Marshal(pd.raw)
	}
	return json.Marshal(pd.value.String())
}

// Duration returns the underlying time.Duration value.
func (pd PreservingDuration) Duration() time.Duration {
	return pd.value
}

// String returns the string representation, preferring the original format.
func (pd PreservingDuration) String() string {
	if pd.raw != "" {
		return pd.raw
	}
	return pd.value.String()
}

// IsZero returns true if the duration is zero.
func (pd PreservingDuration) IsZero() bool {
	return pd.value == 0
}
