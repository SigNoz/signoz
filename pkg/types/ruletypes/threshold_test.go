package ruletypes

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestBasicRuleThresholdEval_UnitConversion(t *testing.T) {
	target := 100.0

	tests := []struct {
		name        string
		threshold   BasicRuleThreshold
		series      *qbtypes.TimeSeries
		ruleUnit    string
		shouldAlert bool
	}{
		{
			name: "milliseconds to seconds conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 0.15, Timestamp: 1000}, // 150ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "milliseconds to seconds conversion - should not alert",
			threshold: BasicRuleThreshold{
				Name:            WarningThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 0.05, Timestamp: 1000}, // 50ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: false,
		},
		{
			name: "seconds to milliseconds conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100s
				TargetUnit:      "s",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            InfoThresholdName,
				TargetValue:     &target, // 100 bytes
				TargetUnit:      "bytes",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 0.15, Timestamp: 1000}, // 0.15KiB ≈ 153.6 bytes
				},
			},
			ruleUnit:    "kbytes",
			shouldAlert: true,
		},
		{
			name: "kibibytes to mebibytes conversion - should alert",
			threshold: BasicRuleThreshold{
				Name:            ErrorThresholdName,
				TargetValue:     &target, // 100KiB
				TargetUnit:      "kbytes",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            WarningThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsBelow,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 0.05, Timestamp: 1000}, // 50ms in seconds
				},
			},
			ruleUnit:    "s",
			shouldAlert: true,
		},
		{
			name: "milliseconds to seconds with OnAverage - should alert",
			threshold: BasicRuleThreshold{
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       OnAverage,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            WarningThresholdName,
				TargetValue:     &target, // 100MB
				TargetUnit:      "decmbytes",
				MatchType:       InTotal,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            InfoThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       AllTheTimes,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            ErrorThresholdName,
				TargetValue:     &target, // 100kB
				TargetUnit:      "deckbytes",
				MatchType:       Last,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100 bytes/s
				TargetUnit:      "Bps",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            InfoThresholdName,
				TargetValue:     &target, // 100ms
				TargetUnit:      "ms",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
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
				Name:            ErrorThresholdName,
				TargetValue:     &target, // 100 (unitless)
				TargetUnit:      "",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsAbove,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 150, Timestamp: 1000}, // 150 (unitless)
				},
			},
			ruleUnit:    "",
			shouldAlert: true,
		},
		// bytes and Gibibytes,
		// rule will only fire if target is converted to bytes so that the sample value becomes lower than the target 100GiBy
		{
			name: "bytes to Gibibytes - should alert",
			threshold: BasicRuleThreshold{
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100 Gibibytes
				TargetUnit:      "GiBy",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsBelow,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 70 * 1024 * 1024 * 1024, Timestamp: 1000}, // 70 Gibibytes
				},
			},
			ruleUnit:    "bytes",
			shouldAlert: true,
		},
		// data Rate conversion - bytes per second to MiB per second
		// rule will only fire if target is converted to bytes so that the sample value becomes lower than the target 100 MiB/s
		{
			name: "bytes per second to MiB per second - should alert",
			threshold: BasicRuleThreshold{
				Name:            CriticalThresholdName,
				TargetValue:     &target, // 100 MiB/s
				TargetUnit:      "MiBy/s",
				MatchType:       AtleastOnce,
				CompareOperator: ValueIsBelow,
			},
			series: &qbtypes.TimeSeries{
				Labels: []*qbtypes.Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name: "service",
						},
						Value: "test",
					},
				},
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 30 * 1024 * 1024, Timestamp: 1000}, // 30 MiB/s
				},
			},
			ruleUnit:    "By/s",
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
		sampleLabels := []*qbtypes.Label{
			{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "test"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "env"}, Value: "prod"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "tier"}, Value: "backend"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "namespace"}, Value: "default"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "pod"}, Value: "test-pod"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "container"}, Value: "test-container"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "node"}, Value: "test-node"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "cluster"}, Value: "test-cluster"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "region"}, Value: "test-region"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "az"}, Value: "test-az"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "hostname"}, Value: "test-hostname"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "ip"}, Value: "192.168.1.1"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "port"}, Value: "8080"},
		}
		lbls := PrepareSampleLabelsForRule(sampleLabels, thresholdName)
		assert.True(t, lbls.Has(LabelThresholdName), "LabelThresholdName not found in labels")
		alertAllHashes[lbls.Hash()] = struct{}{}
	}
	t.Logf("Total hashes: %d", len(alertAllHashes))
	// there should be only one hash for all the samples
	assert.Equal(t, 1, len(alertAllHashes), "Expected only one hash for all the samples")
}
