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
