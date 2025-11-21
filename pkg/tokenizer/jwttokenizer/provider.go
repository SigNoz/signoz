package jwttokenizer

import (
	"context"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/dgraph-io/ristretto/v2"
	"github.com/golang-jwt/jwt/v5"
)

var (
	emptyOrgID valuer.UUID = valuer.UUID{}
)

const (
	expectedLastObservedAtCacheEntries int64 = 5000
)

type provider struct {
	config              tokenizer.Config
	settings            factory.ScopedProviderSettings
	cache               cache.Cache
	tokenStore          authtypes.TokenStore
	lastObservedAtCache *ristretto.Cache[string, map[valuer.UUID]time.Time]
	stopC               chan struct{}
}

func NewFactory(cache cache.Cache, tokenStore authtypes.TokenStore) factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("jwt"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config, cache, tokenStore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config, cache cache.Cache, tokenStore authtypes.TokenStore) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/jwttokenizer")

	if config.JWT.Secret == "" {
		settings.Logger().ErrorContext(ctx, "🚨 CRITICAL SECURITY ISSUE: No JWT secret key specified!", "error", "SIGNOZ_JWT_SECRET environment variable is not set. This has dire consequences for the security of the application. Without a JWT secret, user sessions are vulnerable to tampering and unauthorized access. Please set the SIGNOZ_TOKENIZER_JWT_SECRET environment variable immediately. For more information, please refer to https://github.com/SigNoz/signoz/issues/8400.")
	}

	lastObservedAtCache, err := ristretto.NewCache(&ristretto.Config[string, map[valuer.UUID]time.Time]{
		NumCounters: 10 * expectedLastObservedAtCacheEntries, // 10x of expected entries
		MaxCost:     1 << 19,                                 // ~ 512 KB
		BufferItems: 64,
		Metrics:     false,
	})
	if err != nil {
		return nil, err
	}

	return tokenizer.NewWrappedTokenizer(settings, &provider{
		config:              config,
		settings:            settings,
		cache:               cache,
		tokenStore:          tokenStore,
		lastObservedAtCache: lastObservedAtCache,
		stopC:               make(chan struct{}),
	}), nil
}

func (provider *provider) Start(ctx context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) CreateToken(ctx context.Context, identity *authtypes.Identity, meta map[string]string) (*authtypes.Token, error) {
	accessTokenClaims := Claims{
		UserID: identity.UserID.String(),
		Role:   identity.Role,
		Email:  identity.Email.String(),
		OrgID:  identity.OrgID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(provider.config.Rotation.Interval)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims).SignedString([]byte(provider.config.JWT.Secret))
	if err != nil {
		return nil, err
	}

	refreshTokenClaims := Claims{
		UserID: identity.UserID.String(),
		Role:   identity.Role,
		Email:  identity.Email.String(),
		OrgID:  identity.OrgID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(provider.config.Lifetime.Max)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims).SignedString([]byte(provider.config.JWT.Secret))
	if err != nil {
		return nil, err
	}

	return authtypes.NewTokenFromAccessTokenAndRefreshToken(accessToken, refreshToken, meta, identity.UserID)
}

func (provider *provider) GetIdentity(ctx context.Context, accessToken string) (*authtypes.Identity, error) {
	claims, err := provider.getClaimsFromToken(accessToken)
	if err != nil {
		return nil, err
	}

	// check claimed role
	identity, err := provider.getOrSetIdentity(ctx, emptyOrgID, valuer.MustNewUUID(claims.UserID))
	if err != nil {
		return nil, err
	}

	if identity.Role != claims.Role {
		return nil, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "claim role mismatch")
	}

	return authtypes.NewIdentity(valuer.MustNewUUID(claims.UserID), valuer.MustNewUUID(claims.OrgID), valuer.MustNewEmail(claims.Email), claims.Role), nil
}

func (provider *provider) DeleteToken(ctx context.Context, accessToken string) error {
	provider.settings.Logger().WarnContext(ctx, "Deleting token by access token is not supported for this tokenizer, this is a no-op", "tokenizer_provider", provider.config.Provider)
	return nil
}

func (provider *provider) RotateToken(ctx context.Context, _ string, refreshToken string) (*authtypes.Token, error) {
	claims, err := provider.getClaimsFromToken(refreshToken)
	if err != nil {
		return nil, err
	}

	identity, err := provider.getOrSetIdentity(ctx, emptyOrgID, valuer.MustNewUUID(claims.UserID))
	if err != nil {
		return nil, err
	}

	return provider.CreateToken(ctx, identity, map[string]string{})
}

func (provider *provider) DeleteTokensByUserID(ctx context.Context, userID valuer.UUID) error {
	provider.settings.Logger().WarnContext(ctx, "Deleting token by user id is not supported for this tokenizer, this is a no-op", "tokenizer_provider", provider.config.Provider)
	return nil
}

func (provider *provider) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	provider.cache.Delete(ctx, emptyOrgID, identityCacheKey(userID))
	return nil
}

func (provider *provider) SetLastObservedAt(ctx context.Context, accessToken string, lastObservedAt time.Time) error {
	claims, err := provider.getClaimsFromToken(accessToken)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to set last observed at", "error", err)
		return nil
	}

	cachedLastObservedAts, ok := provider.lastObservedAtCache.Get(claims.OrgID)
	if !ok {
		cachedLastObservedAts = make(map[valuer.UUID]time.Time)
	}

	cachedLastObservedAts[valuer.MustNewUUID(claims.UserID)] = lastObservedAt

	if ok := provider.lastObservedAtCache.Set(claims.OrgID, cachedLastObservedAts, 1); !ok {
		provider.settings.Logger().ErrorContext(ctx, "error caching last observed at timestamp", "user_id", claims.UserID)
	}

	return nil
}

func (provider *provider) Config() tokenizer.Config {
	return provider.config
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	userIDToLastObservedAts := provider.listLastObservedAtDesc(orgID)

	if len(userIDToLastObservedAts) > 0 {
		userIDToLastObservedAtMax := userIDToLastObservedAts[0]
		for _, lastObservedAt := range userIDToLastObservedAtMax {
			if !lastObservedAt.IsZero() {
				stats["auth_token.last_observed_at.max.time"] = lastObservedAt.UTC()
				stats["auth_token.last_observed_at.max.time_unix"] = lastObservedAt.Unix()
				break
			}
		}
	}

	return stats, nil
}

func (provider *provider) getClaimsFromToken(token string) (Claims, error) {
	claims := Claims{}

	_, err := jwt.ParseWithClaims(token, &claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unrecognized signing algorithm: %s", token.Method.Alg())
		}

		return []byte(provider.config.JWT.Secret), nil
	})

	if err != nil {
		return Claims{}, errors.Wrapf(err, errors.TypeUnauthenticated, errors.CodeUnauthenticated, "failed to parse jwt token")
	}

	return claims, nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return nil
}

func (provider *provider) ListMaxLastObservedAtByOrgID(ctx context.Context, orgID valuer.UUID) (map[valuer.UUID]time.Time, error) {
	userIDToLastObservedAts := provider.listLastObservedAtDesc(orgID)

	maxLastObservedAtPerUserID := make(map[valuer.UUID]time.Time)

	for _, userIDToLastObservedAt := range userIDToLastObservedAts {
		for userID, lastObservedAt := range userIDToLastObservedAt {
			if lastObservedAt.IsZero() {
				continue
			}

			if _, ok := maxLastObservedAtPerUserID[userID]; !ok {
				maxLastObservedAtPerUserID[userID] = lastObservedAt.UTC()
				continue
			}

			if lastObservedAt.UTC().After(maxLastObservedAtPerUserID[userID]) {
				maxLastObservedAtPerUserID[userID] = lastObservedAt.UTC()
			}
		}
	}

	return maxLastObservedAtPerUserID, nil
}

func (provider *provider) getOrSetIdentity(ctx context.Context, orgID, userID valuer.UUID) (*authtypes.Identity, error) {
	identity := new(authtypes.Identity)

	err := provider.cache.Get(ctx, orgID, identityCacheKey(userID), identity)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		provider.settings.Logger().ErrorContext(ctx, "failed to get identity from cache", "error", err)
	}

	if err == nil {
		return identity, nil
	}

	identity, err = provider.tokenStore.GetIdentityByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	err = provider.cache.Set(ctx, orgID, identityCacheKey(identity.UserID), identity, -1)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to cache identity", "error", err)
	}

	return identity, nil
}

func (provider *provider) listLastObservedAtDesc(orgID valuer.UUID) []map[valuer.UUID]time.Time {
	var userIDToLastObservedAt []map[valuer.UUID]time.Time

	cachedLastObservedAts, ok := provider.lastObservedAtCache.Get(orgID.String())
	if !ok {
		return nil
	}

	for userID, lastObservedAt := range cachedLastObservedAts {
		userIDToLastObservedAt = append(userIDToLastObservedAt, map[valuer.UUID]time.Time{
			userID: lastObservedAt,
		})
	}

	// sort by descending order of last_observed_at
	slices.SortFunc(userIDToLastObservedAt, func(a, b map[valuer.UUID]time.Time) int {
		var aT, bT time.Time

		for _, t := range a {
			aT = t
			break
		}

		for _, t := range b {
			bT = t
			break
		}

		return bT.Compare(aT)
	})

	return userIDToLastObservedAt
}

func identityCacheKey(userID valuer.UUID) string {
	return "identity::" + userID.String()
}
