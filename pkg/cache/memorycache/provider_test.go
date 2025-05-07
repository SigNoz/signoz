package memorycache

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNew tests the New function
func TestNew(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	assert.NotNil(t, c)
	assert.NotNil(t, c.(*provider).cc)
}

type CacheableEntity struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (ce CacheableEntity) MarshalBinary() ([]byte, error) {
	return json.Marshal(ce)
}

func (ce CacheableEntity) UnmarshalBinary(data []byte) error {
	return nil
}

type DCacheableEntity struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (dce DCacheableEntity) MarshalBinary() ([]byte, error) {
	return json.Marshal(dce)
}

func (dce DCacheableEntity) UnmarshalBinary(data []byte) error {
	return nil
}

// TestStore tests the Store function
// this should fail because of nil pointer error
func TestStoreWithNilPointer(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	var storeCacheableEntity *CacheableEntity
	assert.Error(t, c.Set(context.Background(), valuer.GenerateUUID(), "key", storeCacheableEntity, 10*time.Second))
}

// this should fail because of no pointer error
func TestStoreWithStruct(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	var storeCacheableEntity CacheableEntity
	assert.Error(t, c.Set(context.Background(), valuer.GenerateUUID(), "key", storeCacheableEntity, 10*time.Second))
}

func TestStoreWithNonNilPointer(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Set(context.Background(), valuer.GenerateUUID(), "key", storeCacheableEntity, 10*time.Second))
}

// TestRetrieve tests the Retrieve function
func TestRetrieveWithNilPointer(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	orgID := valuer.GenerateUUID()
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity *CacheableEntity

	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
}

func TestRetrieveWitNonPointer(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	orgID := valuer.GenerateUUID()
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity CacheableEntity

	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
}

func TestRetrieveWithDifferentTypes(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	orgID := valuer.GenerateUUID()
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(DCacheableEntity)
	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
}

func TestRetrieveWithSameTypes(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	orgID := valuer.GenerateUUID()
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(CacheableEntity)
	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
}

// TestRemove tests the Remove function
func TestRemove(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	orgID := valuer.GenerateUUID()
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))
	c.Delete(context.Background(), orgID, "key")

	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
}

// TestBulkRemove tests the BulkRemove function
func TestBulkRemove(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	orgID := valuer.GenerateUUID()
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Set(context.Background(), orgID, "key1", storeCacheableEntity, 10*time.Second))
	assert.NoError(t, c.Set(context.Background(), orgID, "key2", storeCacheableEntity, 10*time.Second))
	c.DeleteMany(context.Background(), orgID, []string{"key1", "key2"})

	err = c.Get(context.Background(), orgID, "key1", retrieveCacheableEntity, false)
	assert.Error(t, err)

	err = c.Get(context.Background(), orgID, "key2", retrieveCacheableEntity, false)
	assert.Error(t, err)
}

// TestCache tests the cache
func TestCache(t *testing.T) {
	opts := cache.Memory{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	orgID := valuer.GenerateUUID()
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second))
	err = c.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
	c.Delete(context.Background(), orgID, "key")
}
