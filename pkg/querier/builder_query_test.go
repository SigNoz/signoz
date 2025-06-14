package querier

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestBuilderQueryFingerprint(t *testing.T) {
	tests := []struct {
		name           string
		query          *builderQuery[qbtypes.MetricAggregation]
		expectInKey    []string
		notExpectInKey []string
	}{
		{
			name: "fingerprint includes shiftby when ShiftBy field is set",
			query: &builderQuery[qbtypes.MetricAggregation]{
				kind: qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 3600,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameTimeShift,
							Args: []qbtypes.FunctionArg{
								{Value: "3600"},
							},
						},
					},
				},
			},
			expectInKey:    []string{"shiftby=3600"},
			notExpectInKey: []string{"functions=", "timeshift", "absolute"},
		},
		{
			name: "fingerprint includes shiftby but not other functions",
			query: &builderQuery[qbtypes.MetricAggregation]{
				kind: qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 3600,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameTimeShift,
							Args: []qbtypes.FunctionArg{
								{Value: "3600"},
							},
						},
						{
							Name: qbtypes.FunctionNameAbsolute,
						},
					},
				},
			},
			expectInKey:    []string{"shiftby=3600"},
			notExpectInKey: []string{"functions=", "absolute"},
		},
		{
			name: "no shiftby in fingerprint when ShiftBy is zero",
			query: &builderQuery[qbtypes.MetricAggregation]{
				kind: qbtypes.RequestTypeTimeSeries,
				spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:  telemetrytypes.SignalMetrics,
					ShiftBy: 0,
					Functions: []qbtypes.Function{
						{
							Name: qbtypes.FunctionNameAbsolute,
						},
					},
				},
			},
			expectInKey:    []string{},
			notExpectInKey: []string{"shiftby=", "functions=", "absolute"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fingerprint := tt.query.Fingerprint()
			for _, expected := range tt.expectInKey {
				assert.True(t, strings.Contains(fingerprint, expected),
					"Expected fingerprint to contain '%s', got: %s", expected, fingerprint)
			}
			for _, notExpected := range tt.notExpectInKey {
				assert.False(t, strings.Contains(fingerprint, notExpected),
					"Expected fingerprint NOT to contain '%s', got: %s", notExpected, fingerprint)
			}
		})
	}
}

func TestMakeBucketsOrder(t *testing.T) {
	// Test that makeBuckets returns buckets in reverse chronological order by default
	// Using milliseconds as input - need > 1 hour range to get multiple buckets
	now := uint64(1700000000000) // Some timestamp in ms
	startMS := now
	endMS := now + uint64(10*60*60*1000) // 10 hours later

	buckets := makeBuckets(startMS, endMS)

	// Should have multiple buckets for a 10 hour range
	assert.True(t, len(buckets) > 1, "Should have multiple buckets for 10 hour range, got %d", len(buckets))

	// Log buckets for debugging
	t.Logf("Generated %d buckets:", len(buckets))
	for i, b := range buckets {
		durationMs := (b.toNS - b.fromNS) / 1e6
		t.Logf("Bucket %d: duration=%dms", i, durationMs)
	}

	// Verify buckets are in reverse chronological order (newest to oldest)
	for i := 0; i < len(buckets)-1; i++ {
		assert.True(t, buckets[i].toNS > buckets[i+1].toNS,
			"Bucket %d end should be after bucket %d end", i, i+1)
		assert.Equal(t, buckets[i].fromNS, buckets[i+1].toNS,
			"Bucket %d start should equal bucket %d end (continuous buckets)", i, i+1)
	}

	// First bucket should end at endNS (converted to nanoseconds)
	expectedEndNS := querybuilder.ToNanoSecs(endMS)
	assert.Equal(t, expectedEndNS, buckets[0].toNS)

	// Last bucket should start at startNS (converted to nanoseconds)
	expectedStartNS := querybuilder.ToNanoSecs(startMS)
	assert.Equal(t, expectedStartNS, buckets[len(buckets)-1].fromNS)
}
