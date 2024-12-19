package redis

import (
	"testing"
	"time"

	"github.com/go-redis/redismock/v8"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

func TestStore(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)

	mock.ExpectSet("key", []byte("value"), 10*time.Second).RedisNil()
	c.Store("key", []byte("value"), 10*time.Second)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRetrieve(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	mock.ExpectSet("key", []byte("value"), 10*time.Second).RedisNil()
	c.Store("key", []byte("value"), 10*time.Second)

	mock.ExpectGet("key").SetVal("value")
	data, retrieveStatus, err := c.Retrieve("key", false)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	if retrieveStatus != status.RetrieveStatusHit {
		t.Errorf("expected status %d, got %d", status.RetrieveStatusHit, retrieveStatus)
	}

	if string(data) != "value" {
		t.Errorf("expected value %s, got %s", "value", string(data))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestSetTTL(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	mock.ExpectSet("key", []byte("value"), 10*time.Second).RedisNil()
	c.Store("key", []byte("value"), 10*time.Second)

	mock.ExpectExpire("key", 4*time.Second).RedisNil()
	c.SetTTL("key", 4*time.Second)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRemove(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	mock.ExpectSet("key", []byte("value"), 10*time.Second).RedisNil()
	c.Store("key", []byte("value"), 10*time.Second)

	mock.ExpectDel("key").RedisNil()
	c.Remove("key")

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestBulkRemove(t *testing.T) {
	db, mock := redismock.NewClientMock()
	c := WithClient(db)
	mock.ExpectSet("key", []byte("value"), 10*time.Second).RedisNil()
	c.Store("key", []byte("value"), 10*time.Second)

	mock.ExpectSet("key2", []byte("value2"), 10*time.Second).RedisNil()
	c.Store("key2", []byte("value2"), 10*time.Second)

	mock.ExpectDel("key", "key2").RedisNil()
	c.BulkRemove([]string{"key", "key2"})

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
