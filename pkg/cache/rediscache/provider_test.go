package rediscache

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/go-redis/redismock/v8"
	"github.com/stretchr/testify/assert"
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

func TestSet(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(factorytest.NewSettings(), "github.com/SigNoz/signoz/pkg/cache/rediscache")}
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	orgID := valuer.GenerateUUID()
	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key"}, "::"), storeCacheableEntity, 10*time.Second).RedisNil()
	_ = cache.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestGet(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(factorytest.NewSettings(), "github.com/SigNoz/signoz/pkg/cache/rediscache")}
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	retrieveCacheableEntity := new(CacheableEntity)

	orgID := valuer.GenerateUUID()
	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key"}, "::"), storeCacheableEntity, 10*time.Second).RedisNil()
	_ = cache.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second)

	data, err := storeCacheableEntity.MarshalBinary()
	assert.NoError(t, err)

	mock.ExpectGet(strings.Join([]string{orgID.StringValue(), "key"}, "::")).SetVal(string(data))
	err = cache.Get(context.Background(), orgID, "key", retrieveCacheableEntity, false)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	assert.Equal(t, storeCacheableEntity, retrieveCacheableEntity)
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestDelete(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(factorytest.NewSettings(), "github.com/SigNoz/signoz/pkg/cache/rediscache")}
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	orgID := valuer.GenerateUUID()

	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key"}, "::"), storeCacheableEntity, 10*time.Second).RedisNil()
	_ = cache.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second)

	mock.ExpectDel(strings.Join([]string{orgID.StringValue(), "key"}, "::")).RedisNil()
	cache.Delete(context.Background(), orgID, "key")

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestDeleteMany(t *testing.T) {
	db, mock := redismock.NewClientMock()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(factorytest.NewSettings(), "github.com/SigNoz/signoz/pkg/cache/rediscache")}
	storeCacheableEntity := &CacheableEntity{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}
	orgID := valuer.GenerateUUID()

	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key"}, "::"), storeCacheableEntity, 10*time.Second).RedisNil()
	_ = cache.Set(context.Background(), orgID, "key", storeCacheableEntity, 10*time.Second)

	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key2"}, "::"), storeCacheableEntity, 10*time.Second).RedisNil()
	_ = cache.Set(context.Background(), orgID, "key2", storeCacheableEntity, 10*time.Second)

	mock.ExpectDel(strings.Join([]string{orgID.StringValue(), "key"}, "::"), strings.Join([]string{orgID.StringValue(), "key2"}, "::")).RedisNil()
	cache.DeleteMany(context.Background(), orgID, []string{"key", "key2"})

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
