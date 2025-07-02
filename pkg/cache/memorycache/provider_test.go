package memorycache

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type CacheableA struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (cacheable *CacheableA) Clone() cachetypes.Cacheable {
	return &CacheableA{
		Key:    cacheable.Key,
		Value:  cacheable.Value,
		Expiry: cacheable.Expiry,
	}
}

func (cacheable *CacheableA) MarshalBinary() ([]byte, error) {
	return json.Marshal(cacheable)
}

func (cacheable *CacheableA) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, cacheable)
}

type CacheableB struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (cacheable *CacheableB) Clone() cachetypes.Cacheable {
	return &CacheableB{
		Key:    cacheable.Key,
		Value:  cacheable.Value,
		Expiry: cacheable.Expiry,
	}
}

func (cacheable *CacheableB) MarshalBinary() ([]byte, error) {
	return json.Marshal(cacheable)
}

func (cacheable *CacheableB) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, cacheable)
}

func TestSetWithNilPointer(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	var cacheable *CacheableA
	assert.Error(t, cache.Set(context.Background(), valuer.GenerateUUID(), "key", cacheable, 10*time.Second))
}

func TestSetWithValidCacheable(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	cacheable := &CacheableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	assert.NoError(t, cache.Set(context.Background(), valuer.GenerateUUID(), "key", cacheable, 10*time.Second))
}

func TestGetWithNilPointer(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	var cacheable *CacheableA
	assert.Error(t, cache.Get(context.Background(), valuer.GenerateUUID(), "key", cacheable, false))
}

func TestSetGetWithSameTypes(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	cacheable := &CacheableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	orgID := valuer.GenerateUUID()
	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cacheable, 10*time.Second))

	cachedCacheable := new(CacheableA)
	err = cache.Get(context.Background(), orgID, "key", cachedCacheable, false)
	assert.NoError(t, err)

	// confirm that the cached cacheable is equal to the original cacheable
	assert.Equal(t, cacheable, cachedCacheable)

	// confirm that the cached cacheable is a different pointer
	assert.NotSame(t, cacheable, cachedCacheable)
}

func TestSetGetWithDifferentTypes(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()

	cacheable := &CacheableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cacheable, 10*time.Second))

	cachedCacheable := new(CacheableB)
	err = cache.Get(context.Background(), orgID, "key", cachedCacheable, false)
	assert.Error(t, err)
}

func TestConcurrentSetGet(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()
	numGoroutines := 100
	done := make(chan bool, numGoroutines*2)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			cacheable := &CacheableA{
				Key:    fmt.Sprintf("key-%d", id),
				Value:  id,
				Expiry: 50 * time.Second,
			}
			err := cache.Set(context.Background(), orgID, fmt.Sprintf("key-%d", id), cacheable, 10*time.Second)
			assert.NoError(t, err)
			done <- true
		}(i)
	}

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			cachedCacheable := new(CacheableA)
			err := cache.Get(context.Background(), orgID, fmt.Sprintf("key-%d", id), cachedCacheable, false)
			// Some keys might not exist due to concurrent access, which is expected
			_ = err
			done <- true
		}(i)
	}

	for i := 0; i < numGoroutines*2; i++ {
		<-done
	}

	for i := 0; i < numGoroutines; i++ {
		cachedCacheable := new(CacheableA)
		assert.NoError(t, cache.Get(context.Background(), orgID, fmt.Sprintf("key-%d", i), cachedCacheable, false))
		assert.Equal(t, fmt.Sprintf("key-%d", i), cachedCacheable.Key)
		assert.Equal(t, i, cachedCacheable.Value)
	}
}
