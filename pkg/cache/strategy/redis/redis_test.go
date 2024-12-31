package redis

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/go-redis/redismock/v8"
	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/cache/status"
)

type CacheableEntity struct {
	Key    string
	Value  int
	Expiry time.Duration
}

func (ce *CacheableEntity) MarshalBinary() ([]byte, error) {
	return json.Marshal(ce)
}

func (ce *CacheableEntity) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, ce)
}

func TestStore(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := WithClient(db)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	mock.ExpectSet("key", storeCacheableEntity, 10*time.Second).RedisNil()
	cache.Store("key", storeCacheableEntity, 10*time.Second)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRetrieve(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := WithClient(db)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)

	mock.ExpectSet("key", storeCacheableEntity, 10*time.Second).RedisNil()
	cache.Store("key", storeCacheableEntity, 10*time.Second)

	data, err := storeCacheableEntity.MarshalBinary()
	assert.NoError(t, err)

	mock.ExpectGet("key").SetVal(string(data))
	retrieveStatus, err := cache.Retrieve("key", retrieveCacheableEntity, false)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	if retrieveStatus != status.RetrieveStatusHit {
		t.Errorf("expected status %d, got %d", status.RetrieveStatusHit, retrieveStatus)
	}

	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestSetTTL(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := WithClient(db)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	mock.ExpectSet("key", storeCacheableEntity, 10*time.Second).RedisNil()
	cache.Store("key", storeCacheableEntity, 10*time.Second)

	mock.ExpectExpire("key", 4*time.Second).RedisNil()
	cache.SetTTL("key", 4*time.Second)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRemove(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	mock.ExpectSet("key", storeCacheableEntity, 10*time.Second).RedisNil()
	c.Store("key", storeCacheableEntity, 10*time.Second)

	mock.ExpectDel("key").RedisNil()
	c.Remove("key")

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestBulkRemove(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	mock.ExpectSet("key", storeCacheableEntity, 10*time.Second).RedisNil()
	c.Store("key", storeCacheableEntity, 10*time.Second)

	mock.ExpectSet("key2", storeCacheableEntity, 10*time.Second).RedisNil()
	c.Store("key2", storeCacheableEntity, 10*time.Second)

	mock.ExpectDel("key", "key2").RedisNil()
	c.BulkRemove([]string{"key", "key2"})

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
