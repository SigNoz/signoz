package generic_cache_inmemory

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

// TestNew tests the New function
func TestNew(t *testing.T) {
	opts := &Options{
		TTL:             10 * time.Second,
		CleanupInterval: 10 * time.Second,
	}
	c := New(opts)
	assert.NotNil(t, c)
	assert.NotNil(t, c.cc)
}

// TestConnect tests the Connect function
func TestConnect(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Connect())
}

type CacheableEntity struct {
	Key    string
	Value  int
	Expiry time.Duration
}

type DCacheableEntity struct {
	Key    string
	Value  int
	Expiry time.Duration
}

// TestStore tests the Store function
// this should fail because of nil pointer error
func TestStoreWithNilPointer(t *testing.T) {
	c := New(nil)
	var storeCacheableEntity *CacheableEntity
	assert.Error(t, c.Store("key", storeCacheableEntity, 10*time.Second))
}

// this should fail because of no pointer error
func TestStoreWithStruct(t *testing.T) {
	c := New(nil)
	var storeCacheableEntity CacheableEntity
	assert.Error(t, c.Store("key", storeCacheableEntity, 10*time.Second))
}

func TestStoreWithNonNilPointer(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))
}

// TestRetrieve tests the Retrieve function
func TestRetrieveWithNilPointer(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity *CacheableEntity

	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusError)
}

func TestRetrieveWitNonPointer(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))

	var retrieveCacheableEntity CacheableEntity

	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusError)
}

func TestRetrieveWithDifferentTypes(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(DCacheableEntity)
	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.Error(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusError)
}

func TestRetrieveWithSameTypes(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))

	retrieveCacheableEntity := new(CacheableEntity)
	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
}

// TestSetTTL tests the SetTTL function
func TestSetTTL(t *testing.T) {
	c := New(&Options{TTL: 10 * time.Second, CleanupInterval: 1 * time.Second})
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Store("key", storeCacheableEntity, 2*time.Second))
	time.Sleep(3 * time.Second)
	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)

	assert.NoError(t, c.Store("key", storeCacheableEntity, 2*time.Second))
	c.SetTTL("key", 4*time.Second)
	time.Sleep(3 * time.Second)
	retrieveStatus, err = c.Retrieve("key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, retrieveCacheableEntity, storeCacheableEntity)
}

// TestRemove tests the Remove function
func TestRemove(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))
	c.Remove("key")

	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)
}

// TestBulkRemove tests the BulkRemove function
func TestBulkRemove(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Store("key1", storeCacheableEntity, 10*time.Second))
	assert.NoError(t, c.Store("key2", storeCacheableEntity, 10*time.Second))
	c.BulkRemove([]string{"key1", "key2"})

	retrieveStatus, err := c.Retrieve("key1", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)

	retrieveStatus, err = c.Retrieve("key2", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Equal(t, new(CacheableEntity), retrieveCacheableEntity)
}

// TestCache tests the cache
func TestCache(t *testing.T) {
	c := New(nil)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)
	assert.NoError(t, c.Store("key", storeCacheableEntity, 10*time.Second))
	retrieveStatus, err := c.Retrieve("key", retrieveCacheableEntity, false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
	c.Remove("key")
}
