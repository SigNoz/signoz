package memorycache

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory/factorytest"
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
	assert.NoError(t, c.Connect(context.Background()))
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
	assert.Error(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))
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
	assert.Error(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity *CacheableEntity

	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusError)
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity CacheableEntity

	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusError)
}

func TestRetrieveWithDifferentTypes(t *testing.T) {
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(DCacheableEntity)
	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusError)
}

func TestRetrieveWithSameTypes(t *testing.T) {
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(CacheableEntity)
	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusHit)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
}

// TestSetTTL tests the SetTTL function
func TestSetTTL(t *testing.T) {
	c, err := New(context.Background(), factorytest.NewSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{TTL: 10 * time.Second, CleanupInterval: 1 * time.Second}})
	require.NoError(t, err)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 2*time.Second))
	time.Sleep(3 * time.Second)
	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)

	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 2*time.Second))
	c.SetTTL(context.Background(), "key", 4*time.Second)
	time.Sleep(3 * time.Second)
	retrieveStatus, err = c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusHit)
	assert.Equal(t, retrieveCacheableEntity, storeCacheableEntity)
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))
	c.Remove(context.Background(), "key")

	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)
}

// TestBulkRemove tests the BulkRemove function
func TestBulkRemove(t *testing.T) {
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
	assert.NoError(t, c.Store(context.Background(), "key1", storeCacheableEntity, 10*time.Second))
	assert.NoError(t, c.Store(context.Background(), "key2", storeCacheableEntity, 10*time.Second))
	c.BulkRemove(context.Background(), []string{"key1", "key2"})

	retrieveStatus, err := c.Retrieve(context.Background(), "key1", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)

	retrieveStatus, err = c.Retrieve(context.Background(), "key2", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)
}

// TestCache tests the cache
func TestCache(t *testing.T) {
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
	assert.NoError(t, c.Store(context.Background(), "key", storeCacheableEntity, 10*time.Second))
	retrieveStatus, err := c.Retrieve(context.Background(), "key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, cache.RetrieveStatusHit)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
	c.Remove(context.Background(), "key")
}
