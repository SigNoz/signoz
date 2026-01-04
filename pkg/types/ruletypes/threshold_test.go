package ruletypes

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

func TestBasicRuleThresholdEval_UnitConversion(t *testing.T) {
	target := 100.0

	tests := []struct {
		name        string
		threshold   BasicRuleThreshold
		series      v3.Series
		ruleUnit    string
		shouldAlert bool
	}{
		{
			name: "milliseconds to seconds conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:        CriticalThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.15, Timestamp: 1000}, // 150ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "milliseconds to seconds conversion - should not alert",
			threshold: BasicRuleThreshold{
				Name:        WarningThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.05, Timestamp: 1000}, // 50ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: false,
		},
		{
			name: "seconds to milliseconds conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:        CriticalThresholdName,
				TargetValue: &target, // 100s
				TargetUnit:  "s",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 150000, Timestamp: 1000}, // 150000ms = 150s
				},
			},
			ruleUnit:    "ms",
			shouldAlert: true,
		},
		// Binary byte conversions
		{
			name: "bytes to kibibytes conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:        InfoThresholdName,
				TargetValue: &target, // 100 bytes
				TargetUnit:  "bytes",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.15, Timestamp: 1000}, // 0.15KiB ≈ 153.6 bytes
				},
			},
			ruleUnit:    "kbytes",
			shouldAlert: true,
		},
		{
			name: "kibibytes to mebibytes conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:        ErrorThresholdName,
				TargetValue: &target, // 100KiB
				TargetUnit:  "kbytes",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.15, Timestamp: 1000},
				},
			},
			ruleUnit:    "mbytes",
			shouldAlert: true,
		},
		// ValueIsBelow with unit conversion
		{
			name: "milliseconds to seconds with ValueIsBelow - should alert",
			threshold: BasicRuleThreshold{
				Name:        WarningThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsBelow,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.05, Timestamp: 1000}, // 50ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "milliseconds to seconds with OnAverage - should alert",
			threshold: BasicRuleThreshold{
				Name:        CriticalThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   OnAverage,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.08, Timestamp: 1000}, // 80ms
					{Value: 0.12, Timestamp: 2000}, // 120ms
					{Value: 0.15, Timestamp: 3000}, // 150ms
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "decimal megabytes to gigabytes with InTotal - should alert",
			threshold: BasicRuleThreshold{
				Name:        WarningThresholdName,
				TargetValue: &target, // 100MB
				TargetUnit:  "decmbytes",
				MatchType:   InTotal,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.04, Timestamp: 1000}, // 40MB
					{Value: 0.05, Timestamp: 2000}, // 50MB
					{Value: 0.03, Timestamp: 3000}, // 30MB
				},
			},
			ruleUnit:    "decgbytes",
			shouldAlert: true,
		},
		{
			name: "milliseconds to seconds with AllTheTimes - should alert",
			threshold: BasicRuleThreshold{
				Name:        InfoThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   AllTheTimes,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.11, Timestamp: 1000}, // 110ms
					{Value: 0.12, Timestamp: 2000}, // 120ms
					{Value: 0.15, Timestamp: 3000}, // 150ms
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "kilobytes to megabytes with Last - should not alert",
			threshold: BasicRuleThreshold{
				Name:        ErrorThresholdName,
				TargetValue: &target, // 100kB
				TargetUnit:  "deckbytes",
				MatchType:   Last,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.15, Timestamp: 1000}, // 150kB
					{Value: 0.05, Timestamp: 2000}, // 50kB (last value)
				},
			},
			ruleUnit:    "decmbytes",
			shouldAlert: false,
		},
		// Mixed units - bytes/second rate conversions
		{
			name: "bytes per second to kilobytes per second - should alert",
			threshold: BasicRuleThreshold{
				Name:        CriticalThresholdName,
				TargetValue: &target, // 100 bytes/s
				TargetUnit:  "Bps",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 0.15, Timestamp: 1000},
				},
			},
			ruleUnit:    "KBs",
			shouldAlert: true,
		},
		// Same unit (no conversion needed)
		{
			name: "same unit - no conversion needed - should alert",
			threshold: BasicRuleThreshold{
				Name:        InfoThresholdName,
				TargetValue: &target, // 100ms
				TargetUnit:  "ms",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 150, Timestamp: 1000}, // 150ms
				},
			},
			ruleUnit:    "ms",
			shouldAlert: true,
		},
		// Empty unit (unitless) - no conversion
		{
			name: "empty unit - no conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:        ErrorThresholdName,
				TargetValue: &target, // 100 (unitless)
				TargetUnit:  "",
				MatchType:   AtleastOnce,
				CompareOp:   ValueIsAbove,
			},
			series: v3.Series{
				Labels: map[string]string{"service": "test"},
				Points: []v3.Point{
					{Value: 150, Timestamp: 1000}, // 150 (unitless)
				},
			},
			ruleUnit:    "",
			shouldAlert: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			thresholds := BasicRuleThresholds{tt.threshold}
			vector, err := thresholds.Eval(tt.series, tt.ruleUnit, EvalData{})
			assert.NoError(t, err)

			alert := len(vector) > 0
			assert.Equal(t, tt.shouldAlert, alert)

			if tt.shouldAlert && alert {
				sample := vector[0]

				hasThresholdLabel := false
				for _, label := range sample.Metric {
					if label.Name == LabelThresholdName && label.Value == tt.threshold.Name {
						hasThresholdLabel = true
						break
					}
				}
				assert.True(t, hasThresholdLabel)
				hasSeverityLabel := false
				for _, label := range sample.Metric {
					if label.Name == LabelSeverityName && label.Value == strings.ToLower(tt.threshold.Name) {
						hasSeverityLabel = true
						break
					}
				}
				assert.True(t, hasSeverityLabel)
				assert.Equal(t, *tt.threshold.TargetValue, sample.Target)
				assert.Equal(t, tt.threshold.TargetUnit, sample.TargetUnit)
			}
		})
	}
}

func TestPrepareSampleLabelsForRule(t *testing.T) {
	alertAllHashes := make(map[uint64]struct{})
	thresholdName := "test"
	for range 50_000 {
		sampleLabels := map[string]string{
			"service":   "test",
			"env":       "prod",
			"tier":      "backend",
			"namespace": "default",
			"pod":       "test-pod",
			"container": "test-container",
			"node":      "test-node",
			"cluster":   "test-cluster",
			"region":    "test-region",
			"az":        "test-az",
			"hostname":  "test-hostname",
			"ip":        "192.168.1.1",
			"port":      "8080",
		}
		lbls := PrepareSampleLabelsForRule(sampleLabels, thresholdName)
		assert.True(t, lbls.Has(LabelThresholdName), "LabelThresholdName not found in labels")
		alertAllHashes[lbls.Hash()] = struct{}{}
	}
	t.Logf("Total hashes: %d", len(alertAllHashes))
	// there should be only one hash for all the samples
	assert.Equal(t, 1, len(alertAllHashes), "Expected only one hash for all the samples")
}
