package tracestelemetryschema

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestIsSuspiciouslyCloseToEdge(t *testing.T) {
	marginNano := uint64(time.Hour.Nanoseconds())

	tests := []struct {
		name         string
		searchFromMS uint64
		searchToMS   uint64
		startNano    uint64
		endNano      uint64
		expectHit    bool
	}{
		{
			name:         "trace exactly in the middle",
			searchFromMS: 1700000000000, // padded bound
			searchToMS:   1700036000000, // + 10 hours
			startNano:    1700010000000 * 1_000_000, // + 2.7 hours inside
			endNano:      1700020000000 * 1_000_000, // + 5.5 hours inside
			expectHit:    false,
		},
		{
			name:         "trace hits lower edge (within 1 hour)",
			searchFromMS: 1700000000000,
			searchToMS:   1700036000000,
			// startNano is just inside the lower bound + 30 mins
			startNano:    (1700000000000 * 1_000_000) + uint64(30*time.Minute.Nanoseconds()),
			endNano:      1700020000000 * 1_000_000,
			expectHit:    true,
		},
		{
			name:         "trace just escapes lower edge margin (1 hour + 1 min)",
			searchFromMS: 1700000000000,
			searchToMS:   1700036000000,
			startNano:    (1700000000000 * 1_000_000) + marginNano + uint64(time.Minute.Nanoseconds()),
			endNano:      1700020000000 * 1_000_000,
			expectHit:    false,
		},
		{
			name:         "trace hits upper edge (within 1 hour)",
			searchFromMS: 1700000000000,
			searchToMS:   1700036000000,
			startNano:    1700010000000 * 1_000_000,
			// endNano is just inside the upper bound - 30 mins
			endNano:      (1700036000000 * 1_000_000) - uint64(30*time.Minute.Nanoseconds()),
			expectHit:    true,
		},
		{
			name:         "trace just escapes upper edge margin (1 hour + 1 min)",
			searchFromMS: 1700000000000,
			searchToMS:   1700036000000,
			startNano:    1700010000000 * 1_000_000,
			endNano:      (1700036000000 * 1_000_000) - marginNano - uint64(time.Minute.Nanoseconds()),
			expectHit:    false,
		},
		{
			name:         "no from bound",
			searchFromMS: 0,
			searchToMS:   1700036000000,
			startNano:    1, // very low, but no lower bound to hit
			endNano:      1700020000000 * 1_000_000,
			expectHit:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hit := isSuspiciouslyCloseToEdge(tt.searchFromMS, tt.searchToMS, tt.startNano, tt.endNano)
			assert.Equal(t, tt.expectHit, hit)
		})
	}
}
