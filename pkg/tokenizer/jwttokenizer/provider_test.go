package jwttokenizer

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/tokenizer/tokenizerstore/sqltokenizerstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestProvider(t *testing.T) tokenizer.Tokenizer {
	instrumentation := instrumentationtest.New()
	cache, err := cachetest.New(cache.Config{
		Memory: cache.Memory{
			NumCounters: 1000,
			MaxCost:     1 << 26,
		},
	})
	require.NoError(t, err)
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	require.NoError(t, err)

	provider, err := New(
		context.Background(),
		instrumentation.ToProviderSettings(),
		tokenizer.Config{
			Rotation: tokenizer.RotationConfig{
				Interval: 1 * time.Second,  // 1 second
				Duration: 60 * time.Second, // 60 seconds
			},
			Lifetime: tokenizer.LifetimeConfig{
				Idle: 7 * 24 * time.Hour,  // 7 days
				Max:  30 * 24 * time.Hour, // 30 days
			}},
		cache,
		sqltokenizerstore.NewStore(sqlstore),
	)
	require.NoError(t, err)

	return provider
}

func TestLastObservedAt_Concurrent(t *testing.T) {
	provider := newTestProvider(t)
	orgID := valuer.GenerateUUID()

	token1, err := provider.CreateToken(
		context.Background(),
		&authtypes.Identity{
			UserID: valuer.GenerateUUID(),
			OrgID:  orgID,
			Role:   types.RoleAdmin,
			Email:  valuer.MustNewEmail("test@test.com"),
		},
		map[string]string{},
	)
	require.NoError(t, err)

	token2, err := provider.CreateToken(
		context.Background(),
		&authtypes.Identity{
			UserID: valuer.GenerateUUID(),
			OrgID:  orgID,
			Role:   types.RoleAdmin,
			Email:  valuer.MustNewEmail("test@test.com"),
		},
		map[string]string{},
	)
	require.NoError(t, err)

	wg := sync.WaitGroup{}
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			assert.NoError(t, provider.SetLastObservedAt(context.Background(), token1.AccessToken, time.Now()))
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			assert.NoError(t, provider.SetLastObservedAt(context.Background(), token2.AccessToken, time.Now()))
		}()
	}
	wg.Wait()
}
