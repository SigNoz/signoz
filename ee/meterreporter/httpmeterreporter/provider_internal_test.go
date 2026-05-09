package httpmeterreporter

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateCollectorsRejectsBadRegistry(t *testing.T) {
	meterA := zeustypes.MustNewMeterName("signoz.test.a")
	meterB := zeustypes.MustNewMeterName("signoz.test.b")

	t.Run("key name mismatch", func(t *testing.T) {
		_, err := validateCollectors(map[zeustypes.MeterName]metercollector.MeterCollector{
			meterA: testCollector{name: meterB},
		})
		require.Error(t, err)
	})

	t.Run("nil collector", func(t *testing.T) {
		_, err := validateCollectors(map[zeustypes.MeterName]metercollector.MeterCollector{
			meterA: nil,
		})
		require.Error(t, err)
	})
}

func TestEligibleCollectors(t *testing.T) {
	meterA := zeustypes.MustNewMeterName("signoz.test.a")
	meterB := zeustypes.MustNewMeterName("signoz.test.b")
	collectors := []metercollector.MeterCollector{
		testCollector{name: meterA},
		testCollector{name: meterB},
	}

	day := time.Date(2026, 5, 4, 0, 0, 0, 0, time.UTC)

	testCases := []struct {
		name          string
		nextByMeter   map[zeustypes.MeterName]time.Time
		expectedNames []zeustypes.MeterName
	}{
		{
			name: "BothEligibleWhenNextAtOrBeforeDay",
			nextByMeter: map[zeustypes.MeterName]time.Time{
				meterA: day.AddDate(0, 0, -2),
				meterB: day,
			},
			expectedNames: []zeustypes.MeterName{meterA, meterB},
		},
		{
			name: "OnlyLaggardEligibleWhenLeaderAheadOfDay",
			nextByMeter: map[zeustypes.MeterName]time.Time{
				meterA: day.AddDate(0, 0, -1),
				meterB: day.AddDate(0, 0, 1),
			},
			expectedNames: []zeustypes.MeterName{meterA},
		},
		{
			name: "NoneEligibleWhenAllAhead",
			nextByMeter: map[zeustypes.MeterName]time.Time{
				meterA: day.AddDate(0, 0, 1),
				meterB: day.AddDate(0, 0, 2),
			},
			expectedNames: []zeustypes.MeterName{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := eligibleCollectors(collectors, testCase.nextByMeter, day)
			gotNames := make([]zeustypes.MeterName, 0, len(got))
			for _, c := range got {
				gotNames = append(gotNames, c.Name())
			}
			assert.Equal(t, testCase.expectedNames, gotNames)
		})
	}
}

type testCollector struct {
	name        zeustypes.MeterName
	unit        zeustypes.MeterUnit
	aggregation zeustypes.MeterAggregation
	origin      time.Time
}

func (c testCollector) Name() zeustypes.MeterName {
	return c.name
}

func (c testCollector) Unit() zeustypes.MeterUnit {
	if c.unit.IsZero() {
		return zeustypes.MeterUnitCount
	}
	return c.unit
}

func (c testCollector) Aggregation() zeustypes.MeterAggregation {
	if c.aggregation.IsZero() {
		return zeustypes.MeterAggregationSum
	}
	return c.aggregation
}

func (c testCollector) Origin(_ context.Context, _ valuer.UUID, todayStart time.Time) (time.Time, error) {
	if c.origin.IsZero() {
		return todayStart, nil
	}
	return c.origin, nil
}

func (c testCollector) Collect(context.Context, valuer.UUID, *licensetypes.License, zeustypes.MeterWindow) ([]zeustypes.Meter, error) {
	return nil, nil
}
