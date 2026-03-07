package memorycache

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type CloneableA struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (cloneable *CloneableA) Clone() cachetypes.Cacheable {
	return &CloneableA{
		Key:    cloneable.Key,
		Value:  cloneable.Value,
		Expiry: cloneable.Expiry,
	}
}

func (cloneable *CloneableA) MarshalBinary() ([]byte, error) {
	return json.Marshal(cloneable)
}

func (cloneable *CloneableA) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, cloneable)
}

type CacheableB struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (cacheable *CacheableB) MarshalBinary() ([]byte, error) {
	return json.Marshal(cacheable)
}

func (cacheable *CacheableB) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, cacheable)
}

func TestCloneableSetWithNilPointer(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	var cloneable *CloneableA
	assert.Error(t, cache.Set(context.Background(), valuer.GenerateUUID(), "key", cloneable, 10*time.Second))
}

func TestCacheableSetWithNilPointer(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	var cacheable *CacheableB
	assert.Error(t, cache.Set(context.Background(), valuer.GenerateUUID(), "key", cacheable, 10*time.Second))
}

func TestCloneableSetGet(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()
	cloneable := &CloneableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cloneable, 10*time.Second))

	provider := cache.(*provider)
	insideCache, found := provider.cc.Get(strings.Join([]string{orgID.StringValue(), "key"}, "::"))
	assert.True(t, found)
	assert.IsType(t, &CloneableA{}, insideCache)

	cached := new(CloneableA)
	assert.NoError(t, cache.Get(context.Background(), orgID, "key", cached))

	assert.Equal(t, cloneable, cached)
	// confirm that the cached cloneable is a different pointer
	assert.NotSame(t, cloneable, cached)
}

func TestCacheableSetGet(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()
	cacheable := &CacheableB{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cacheable, 10*time.Second))

	provider := cache.(*provider)
	insideCache, found := provider.cc.Get(strings.Join([]string{orgID.StringValue(), "key"}, "::"))
	assert.True(t, found)
	assert.IsType(t, []byte{}, insideCache)
	assert.Equal(t, "{\"Key\":\"some-random-key\",\"Value\":1,\"Expiry\":1000}", string(insideCache.([]byte)))

	cached := new(CacheableB)
	assert.NoError(t, cache.Get(context.Background(), orgID, "key", cached))

	assert.Equal(t, cacheable, cached)
	assert.NotSame(t, cacheable, cached)
}

func TestGetWithNilPointer(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	var cloneable *CloneableA
	assert.Error(t, cache.Get(context.Background(), valuer.GenerateUUID(), "key", cloneable))
}

func TestSetGetWithDifferentTypes(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()

	cloneable := &CloneableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cloneable, 10*time.Second))

	cachedCacheable := new(CacheableB)
	err = cache.Get(context.Background(), orgID, "key", cachedCacheable)
	assert.Error(t, err)
}

func TestCloneableConcurrentSetGet(t *testing.T) {
	cache, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}})
	require.NoError(t, err)

	orgID := valuer.GenerateUUID()
	numGoroutines := 100
	done := make(chan bool, numGoroutines*2)
	cloneables := make([]*CloneableA, numGoroutines)
	mu := sync.Mutex{}

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			cloneable := &CloneableA{
				Key:    fmt.Sprintf("key-%d", id),
				Value:  id,
				Expiry: 50 * time.Second,
			}
			err := cache.Set(context.Background(), orgID, fmt.Sprintf("key-%d", id), cloneable, 10*time.Second)
			assert.NoError(t, err)
			mu.Lock()
			cloneables[id] = cloneable
			mu.Unlock()
			done <- true
		}(i)
	}

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			cachedCloneable := new(CloneableA)
			err := cache.Get(context.Background(), orgID, fmt.Sprintf("key-%d", id), cachedCloneable)
			// Some keys might not exist due to concurrent access, which is expected
			_ = err
			done <- true
		}(i)
	}

	for i := 0; i < numGoroutines*2; i++ {
		<-done
	}

	for i := 0; i < numGoroutines; i++ {
		cachedCloneable := new(CloneableA)
		assert.NoError(t, cache.Get(context.Background(), orgID, fmt.Sprintf("key-%d", i), cachedCloneable))
		assert.Equal(t, fmt.Sprintf("key-%d", i), cachedCloneable.Key)
		assert.Equal(t, i, cachedCloneable.Value)
		// confirm that the cached cacheable is a different pointer
		assert.NotSame(t, cachedCloneable, cloneables[i])
	}
}
