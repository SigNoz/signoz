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

func (cloneable *CloneableA) Cost() int64 {
	return int64(len(cloneable.Key)) + 16
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

// LargeCloneable reports a large byte cost so we can test ristretto eviction
// without allocating the full payload in memory.
type LargeCloneable struct {
	Key      string
	CostHint int64
}

func (c *LargeCloneable) Clone() cachetypes.Cacheable {
	return &LargeCloneable{Key: c.Key, CostHint: c.CostHint}
}

func (c *LargeCloneable) Cost() int64 { return c.CostHint }

func (c *LargeCloneable) MarshalBinary() ([]byte, error) { return json.Marshal(c) }

func (c *LargeCloneable) UnmarshalBinary(data []byte) error { return json.Unmarshal(data, c) }

func TestCloneableCostTriggersEviction(t *testing.T) {
	const maxCost int64 = 1 << 20  // 1 MiB
	const small int64 = 256 * 1024 // 256 KiB
	const big int64 = 512 * 1024   // 512 KiB
	const fill = 3                 // 3 * 256 KiB = 768 KiB, leaves room

	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     maxCost,
	}})
	require.NoError(t, err)

	cc := c.(*provider).cc
	orgID := valuer.GenerateUUID()
	keyFor := func(i int) string { return fmt.Sprintf("key-%d", i) }
	ristrettoKey := func(i int) string {
		return strings.Join([]string{orgID.StringValue(), keyFor(i)}, "::")
	}

	// Fill the cache under capacity so every small entry must be admitted.
	for i := 0; i < fill; i++ {
		require.NoError(t, c.Set(context.Background(), orgID, keyFor(i),
			&LargeCloneable{Key: keyFor(i), CostHint: small}, time.Minute))
	}
	for i := 0; i < fill; i++ {
		_, ok := cc.Get(ristrettoKey(i))
		require.True(t, ok, "key-%d should be present after under-capacity fill", i)
	}

	// Now add a tipping entry whose cost makes the total exceed MaxCost.
	// 3 * 256 KiB + 512 KiB = 1.25 MiB > 1 MiB, so all four entries cannot
	// coexist: ristretto must evict at least one or reject the new one.
	tip := fill
	require.NoError(t, c.Set(context.Background(), orgID, keyFor(tip),
		&LargeCloneable{Key: keyFor(tip), CostHint: big}, time.Minute))

	// Probe ristretto directly: sum the cost of surviving entries.
	var retainedCost int64
	survivors := 0
	for i := 0; i <= tip; i++ {
		if _, ok := cc.Get(ristrettoKey(i)); ok {
			survivors++
			if i == tip {
				retainedCost += big
			} else {
				retainedCost += small
			}
		}
	}

	// The full set's total cost (1.25 MiB) cannot fit, so at least one entry
	// must be absent. This assertion reads cache state directly, not metrics.
	require.Less(t, survivors, tip+1,
		"all %d entries cannot coexist in a %d-byte cache", tip+1, maxCost)
	require.LessOrEqual(t, retainedCost, maxCost,
		"sum of survivor costs must respect MaxCost")
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
