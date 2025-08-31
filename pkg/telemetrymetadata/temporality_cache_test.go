package telemetrymetadata

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/stretchr/testify/assert"
)

func TestTemporalityCache_Jitter(t *testing.T) {
	config := TemporalityCacheConfig{
		SoftTTL:       1 * time.Minute,
		HardTTL:       5 * time.Minute,
		JitterPercent: 20,
	}

	tc := &TemporalityCache{
		jitterPercent: config.JitterPercent,
	}

	// Test jitter produces different values
	ttlValues := make(map[time.Duration]bool)
	for i := 0; i < 10; i++ {
		jittered := tc.applyJitter(config.SoftTTL)
		ttlValues[jittered] = true

		// Check jitter is within expected range
		minTTL := time.Duration(float64(config.SoftTTL) * 0.8)
		maxTTL := time.Duration(float64(config.SoftTTL) * 1.2)
		assert.GreaterOrEqual(t, jittered, minTTL)
		assert.LessOrEqual(t, jittered, maxTTL)
	}

	// Should have multiple different values due to jitter
	assert.Greater(t, len(ttlValues), 1, "Jitter should produce different TTL values")
}

func TestTemporalityCacheConfig_Default(t *testing.T) {
	config := DefaultTemporalityCacheConfig()

	assert.Equal(t, 5*time.Minute, config.SoftTTL)
	assert.Equal(t, 30*time.Minute, config.HardTTL)
	assert.Equal(t, 10, config.JitterPercent)
}

func TestTemporalityCacheEntry_Serialization(t *testing.T) {
	entry := TemporalityCacheEntry{
		Temporality: metrictypes.Delta,
		CachedAt:    time.Now(),
		SoftTTL:     5 * time.Minute,
		HardTTL:     30 * time.Minute,
	}

	// Test marshaling
	data, err := entry.MarshalBinary()
	assert.NoError(t, err)
	assert.NotEmpty(t, data)

	// Test unmarshaling
	var decoded TemporalityCacheEntry
	err = decoded.UnmarshalBinary(data)
	assert.NoError(t, err)
	assert.Equal(t, entry.Temporality, decoded.Temporality)
	assert.Equal(t, entry.SoftTTL, decoded.SoftTTL)
	assert.Equal(t, entry.HardTTL, decoded.HardTTL)
}
