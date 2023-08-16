package inmemory

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

// TestStore tests the Store function
func TestStore(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Store("key", []byte("value"), 10*time.Second))
}

// TestRetrieve tests the Retrieve function
func TestRetrieve(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Store("key", []byte("value"), 10*time.Second))
	data, retrieveStatus, err := c.Retrieve("key", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, data, []byte("value"))
}

// TestSetTTL tests the SetTTL function
func TestSetTTL(t *testing.T) {
	c := New(&Options{TTL: 10 * time.Second, CleanupInterval: 1 * time.Second})
	assert.NoError(t, c.Store("key", []byte("value"), 2*time.Second))
	time.Sleep(3 * time.Second)
	data, retrieveStatus, err := c.Retrieve("key", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Nil(t, data)

	assert.NoError(t, c.Store("key", []byte("value"), 2*time.Second))
	c.SetTTL("key", 4*time.Second)
	time.Sleep(3 * time.Second)
	data, retrieveStatus, err = c.Retrieve("key", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, data, []byte("value"))
}

// TestRemove tests the Remove function
func TestRemove(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Store("key", []byte("value"), 10*time.Second))
	c.Remove("key")

	data, retrieveStatus, err := c.Retrieve("key", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Nil(t, data)
}

// TestBulkRemove tests the BulkRemove function
func TestBulkRemove(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Store("key1", []byte("value"), 10*time.Second))
	assert.NoError(t, c.Store("key2", []byte("value"), 10*time.Second))
	c.BulkRemove([]string{"key1", "key2"})

	data, retrieveStatus, err := c.Retrieve("key1", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Nil(t, data)

	data, retrieveStatus, err = c.Retrieve("key2", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusKeyMiss)
	assert.Nil(t, data)
}

// TestCache tests the cache
func TestCache(t *testing.T) {
	c := New(nil)
	assert.NoError(t, c.Store("key", []byte("value"), 10*time.Second))
	data, retrieveStatus, err := c.Retrieve("key", false)
	assert.NoError(t, err)
	assert.Equal(t, retrieveStatus, status.RetrieveStatusHit)
	assert.Equal(t, data, []byte("value"))
	c.Remove("key")
}
