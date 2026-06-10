package emptystatetypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLicenseStatusMarshalJSON(t *testing.T) {
	tests := []struct {
		name   string
		status LicenseStatus
		want   string
	}{
		{
			name:   "known zeus state preserves case",
			status: LicenseStatus("ACTIVATED"),
			want:   `"ACTIVATED"`,
		},
		{
			name:   "unknown sentinel preserves case",
			status: LicenseStatusUnknown,
			want:   `"UNKNOWN"`,
		},
		{
			name:   "novel state passes through",
			status: LicenseStatus("FUTURE_STATE"),
			want:   `"FUTURE_STATE"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.status)
			assert.NoError(t, err)
			assert.Equal(t, tt.want, string(got))
		})
	}
}
