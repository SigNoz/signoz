package jwttokenizer

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/golang-jwt/jwt/v5"
)

type provider struct {
	config   tokenizer.Config
	settings factory.ScopedProviderSettings
	stopC    chan struct{}
}

func NewFactory() factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("jwt"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/jwttokenizer")

	if config.JWT.Secret == "" {
		settings.Logger().ErrorContext(ctx, "🚨 CRITICAL SECURITY ISSUE: No JWT secret key specified!", "error", "SIGNOZ_JWT_SECRET environment variable is not set. This has dire consequences for the security of the application. Without a JWT secret, user sessions are vulnerable to tampering and unauthorized access. Please set the SIGNOZ_TOKENIZER_JWT_SECRET environment variable immediately. For more information, please refer to https://github.com/SigNoz/signoz/issues/8400.")
	}

	return tokenizer.NewWrappedTokenizer(settings, &provider{
		config:   config,
		settings: settings,
		stopC:    make(chan struct{}),
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

	return provider.CreateToken(ctx, authtypes.NewIdentity(valuer.MustNewUUID(claims.UserID), valuer.MustNewUUID(claims.OrgID), valuer.MustNewEmail(claims.Email), claims.Role), map[string]string{})
}

func (provider *provider) DeleteTokensByUserID(ctx context.Context, userID valuer.UUID) error {
	provider.settings.Logger().WarnContext(ctx, "Deleting token by user id is not supported for this tokenizer, this is a no-op", "tokenizer_provider", provider.config.Provider)
	return nil
}

func (provider *provider) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	provider.settings.Logger().WarnContext(ctx, "Deleting identity is not supported for this tokenizer, this is a no-op", "tokenizer_provider", provider.config.Provider)
	return nil
}

func (provider *provider) SetLastObservedAt(ctx context.Context, accessToken string, lastObservedAt time.Time) error {
	provider.settings.Logger().WarnContext(ctx, "Setting last observed at is not supported for this tokenizer, this is a no-op", "tokenizer_provider", provider.config.Provider)
	return nil
}

func (provider *provider) Config() tokenizer.Config {
	return provider.config
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	return map[string]any{}, nil
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
	return map[valuer.UUID]time.Time{}, nil
}
