package staticmetercollector

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

func TestCollect(t *testing.T) {
	orgID := valuer.GenerateUUID()
	window := completedWindow()
	config := metercollector.StaticConfig{
		Name:        zeustypes.MeterBasePlatformFee,
		Unit:        zeustypes.MeterUnitCount,
		Aggregation: zeustypes.MeterAggregationMax,
		Value:       1,
	}

	expectedActiveMeter := zeustypes.NewMeter(
		config.Name,
		config.Value,
		config.Unit,
		config.Aggregation,
		window,
		zeustypes.NewDimensions(zeustypes.OrganizationID.String(orgID.StringValue())),
	)

	testCases := []struct {
		name     string
		license  *licensetypes.License
		expected []zeustypes.Meter
	}{
		{
			name:     "ActiveLicenseEmitsMeter",
			license:  &licensetypes.License{Key: "license-key"},
			expected: []zeustypes.Meter{expectedActiveMeter},
		},
		{
			name:     "NilLicenseEmitsNothing",
			license:  nil,
			expected: nil,
		},
		{
			name:     "EmptyKeyEmitsNothing",
			license:  &licensetypes.License{Key: ""},
			expected: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			provider := &Provider{config: config}

			readings, err := provider.Collect(context.Background(), orgID, testCase.license, window)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, readings)
		})
	}
}

func TestProviderMetadata(t *testing.T) {
	testCases := []metercollector.StaticConfig{
		{
			Name:        zeustypes.MeterBasePlatformFee,
			Unit:        zeustypes.MeterUnitCount,
			Aggregation: zeustypes.MeterAggregationMax,
			Value:       1,
		},
		{
			Name:        zeustypes.MustNewMeterName("signoz.test.static"),
			Unit:        zeustypes.MeterUnitBytes,
			Aggregation: zeustypes.MeterAggregationSum,
			Value:       42,
		},
	}

	for _, config := range testCases {
		t.Run(config.Name.String(), func(t *testing.T) {
			provider := &Provider{config: config}
			assert.Equal(t, config.Name, provider.Name())
			assert.Equal(t, config.Unit, provider.Unit())
			assert.Equal(t, config.Aggregation, provider.Aggregation())
		})
	}
}

func TestOrigin(t *testing.T) {
	provider := &Provider{config: metercollector.StaticConfig{Name: zeustypes.MeterBasePlatformFee}}
	todayStart := time.Date(2026, 5, 4, 0, 0, 0, 0, time.UTC)

	origin, err := provider.Origin(context.Background(), valuer.GenerateUUID(), todayStart)
	require.NoError(t, err)
	assert.Equal(t, todayStart, origin)
}

func TestStaticConfigValidate(t *testing.T) {
	base := metercollector.StaticConfig{
		Name:        zeustypes.MeterBasePlatformFee,
		Unit:        zeustypes.MeterUnitCount,
		Aggregation: zeustypes.MeterAggregationMax,
		Value:       1,
	}

	testCases := []struct {
		name      string
		mutate    func(*metercollector.StaticConfig)
		expectErr bool
	}{
		{name: "Valid", mutate: func(*metercollector.StaticConfig) {}, expectErr: false},
		{name: "ZeroName", mutate: func(c *metercollector.StaticConfig) { c.Name = zeustypes.MeterName{} }, expectErr: true},
		{name: "ZeroValueAllowed", mutate: func(c *metercollector.StaticConfig) { c.Value = 0 }, expectErr: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			config := base
			testCase.mutate(&config)
			err := config.Validate()
			if testCase.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func completedWindow() zeustypes.MeterWindow {
	start := time.Date(2026, 5, 4, 0, 0, 0, 0, time.UTC)
	return zeustypes.MustNewMeterWindow(start.UnixMilli(), start.AddDate(0, 0, 1).UnixMilli(), true)
}
