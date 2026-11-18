package rediscache

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/go-redis/redismock/v9"
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

func (cacheable *CacheableA) Cost() int64 {
	return int64(len(cacheable.Key)) + 16
}

func (cacheable *CacheableA) MarshalBinary() ([]byte, error) {
	return json.Marshal(cacheable)
}

func (cacheable *CacheableA) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, cacheable)
}

func TestSet(t *testing.T) {
	db, mock := redismock.NewClientMock()
	providerSettings := instrumentationtest.New().ToProviderSettings()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/cache/rediscache")}

	cacheable := &CacheableA{
		Key:    "some-random-key",
		Value:  1,
		Expiry: time.Microsecond,
	}

	orgID := valuer.GenerateUUID()
	mock.ExpectSet(strings.Join([]string{orgID.StringValue(), "key"}, "::"), cacheable, 10*time.Second).SetVal("ok")

	assert.NoError(t, cache.Set(context.Background(), orgID, "key", cacheable, 10*time.Second))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetMany(t *testing.T) {
	db, mock := redismock.NewClientMock()
	providerSettings := instrumentationtest.New().ToProviderSettings()
	cache := &provider{client: db, settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/cache/rediscache")}

	orgID := valuer.GenerateUUID()
	stored, err := json.Marshal(&CacheableA{Key: "first", Value: 1, Expiry: time.Microsecond})
	require.NoError(t, err)
	// one round trip for all keys, with the missing one answered as nil and
	// the third holding something that is not a CacheableA
	mock.ExpectMGet(
		strings.Join([]string{orgID.StringValue(), "first"}, "::"),
		strings.Join([]string{orgID.StringValue(), "second"}, "::"),
		strings.Join([]string{orgID.StringValue(), "third"}, "::"),
	).SetVal([]any{string(stored), nil, "not json"})

	dests := []cachetypes.Cacheable{new(CacheableA), new(CacheableA), new(CacheableA)}
	err = cache.GetMany(context.Background(), orgID, []string{"first", "second", "third"}, dests)

	// the unreadable key is reported and nilled, the readable one is still served
	assert.Error(t, err)
	assert.Equal(t, []cachetypes.Cacheable{&CacheableA{Key: "first", Value: 1, Expiry: time.Microsecond}, nil, nil}, dests)
	assert.NoError(t, mock.ExpectationsWereMet())
}
