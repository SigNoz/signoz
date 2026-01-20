package authtypes

import (
	"context"
	"encoding/json"
	"net/url"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/sethvargo/go-password/password"
	"github.com/uptrace/bun"
)

var (
	ErrCodeTokenRotationRequired    = errors.MustNewCode("token_rotation_required")
	ErrCodeTokenExpired             = errors.MustNewCode("token_expired")
	ErrCodeTokenNotFound            = errors.MustNewCode("token_not_found")
	ErrCodeTokenOlderLastObservedAt = errors.MustNewCode("token_older_last_observed_at")
)

var _ cachetypes.Cacheable = (*Token)(nil)

type PostableRotateToken struct {
	RefreshToken string `json:"refreshToken"`
}

type StorableToken = Token

type GettableToken struct {
	TokenType    string `json:"tokenType"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"`
}

type Token struct {
	bun.BaseModel `bun:"table:auth_token,alias:auth_token"`

	ID               valuer.UUID       `bun:"id,pk,type:text"`
	Meta             map[string]string `bun:"meta,notnull"`
	PrevAccessToken  string            `bun:"prev_access_token,nullzero"`
	AccessToken      string            `bun:"access_token,notnull"`
	PrevRefreshToken string            `bun:"prev_refresh_token,nullzero"`
	RefreshToken     string            `bun:"refresh_token,notnull"`
	LastObservedAt   time.Time         `bun:"last_observed_at,nullzero"`
	RotatedAt        time.Time         `bun:"rotated_at,nullzero"`
	CreatedAt        time.Time         `bun:"created_at,notnull"`
	UpdatedAt        time.Time         `bun:"updated_at,notnull"`
	UserID           valuer.UUID       `bun:"user_id,notnull"`
}

func NewToken(meta map[string]string, userID valuer.UUID) (*Token, error) {
	accessToken := password.MustGenerate(32, 10, 0, true, true)
	refreshToken := password.MustGenerate(32, 12, 0, true, true)

	return &Token{
		ID:               valuer.GenerateUUID(),
		Meta:             meta,
		PrevAccessToken:  "",
		AccessToken:      accessToken,
		PrevRefreshToken: "",
		RefreshToken:     refreshToken,
		LastObservedAt:   time.Time{},
		RotatedAt:        time.Time{},
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		UserID:           userID,
	}, nil
}

func NewTokenFromAccessTokenAndRefreshToken(accessToken string, refreshToken string, meta map[string]string, userID valuer.UUID) (*Token, error) {
	return &Token{
		ID:               valuer.UUID{},
		Meta:             meta,
		PrevAccessToken:  "",
		AccessToken:      accessToken,
		PrevRefreshToken: "",
		RefreshToken:     refreshToken,
		LastObservedAt:   time.Time{},
		RotatedAt:        time.Time{},
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		UserID:           userID,
	}, nil
}

func NewGettableTokenFromToken(token *Token, rotationInterval time.Duration) *GettableToken {
	return &GettableToken{
		TokenType:    "bearer",
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		ExpiresIn:    int(time.Until(token.RotationAt(rotationInterval)).Seconds()),
	}
}

func NewURLValuesFromToken(token *Token, rotationInterval time.Duration) url.Values {
	return url.Values{
		"tokenType":    {"bearer"},
		"accessToken":  {token.AccessToken},
		"refreshToken": {token.RefreshToken},
		"expiresIn":    {strconv.Itoa(int(time.Until(token.RotationAt(rotationInterval)).Seconds()))},
	}
}

func (typ *PostableRotateToken) UnmarshalJSON(data []byte) error {
	type Alias PostableRotateToken
	var temp Alias

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.RefreshToken == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "refresh token is required")
	}

	*typ = PostableRotateToken(temp)
	return nil
}

func (typ *Token) IsValid(rotationInterval time.Duration, idleDuration time.Duration, maxDuration time.Duration) error {
	// Check for expiration
	if err := typ.IsExpired(idleDuration, maxDuration); err != nil {
		return err
	}

	// Check for rotation
	if err := typ.IsRotationRequired(rotationInterval); err != nil {
		return err
	}

	return nil
}

func (typ *Token) IsExpired(idleDuration time.Duration, maxDuration time.Duration) error {
	// If now - last_seen_at > idle_duration, the token will be considered as expired.
	if !typ.LastObservedAt.IsZero() && typ.LastObservedAt.Before(time.Now().Add(-idleDuration)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenExpired, "token has not been used for too long")
	}

	// If now - created_at > max_duration, the token will be considered as expired.
	if typ.CreatedAt.Before(time.Now().Add(-maxDuration)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenExpired, "token was created a long time ago")
	}

	return nil
}

func (typ *Token) IsRotationRequired(rotationInterval time.Duration) error {
	if !typ.RotatedAt.IsZero() && typ.RotatedAt.Before(time.Now().Add(-rotationInterval)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenRotationRequired, "token needs to be rotated")
	}

	if typ.RotatedAt.IsZero() && typ.CreatedAt.Before(time.Now().Add(-rotationInterval)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenRotationRequired, "token needs to be rotated")
	}

	return nil
}

func (typ *Token) Rotate(accessTokenOrPrevAccessToken string, refreshTokenOrPrevRefreshToken string, rotationDuration time.Duration, idleDuration time.Duration, maxDuration time.Duration) error {
	if typ.PrevAccessToken == accessTokenOrPrevAccessToken && typ.PrevRefreshToken == refreshTokenOrPrevRefreshToken {
		// If the token has been rotated within the rotation duration, do nothing and return the same token.
		if !typ.RotatedAt.IsZero() && typ.RotatedAt.Before(time.Now().Add(-rotationDuration)) {
			return nil
		}

		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "invalid token pair")
	}

	if typ.AccessToken != accessTokenOrPrevAccessToken || typ.RefreshToken != refreshTokenOrPrevRefreshToken {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "invalid token pair")
	}

	if err := typ.IsExpired(idleDuration, maxDuration); err != nil {
		return err
	}

	// Generate new access and refresh tokens.
	typ.PrevAccessToken = typ.AccessToken
	typ.AccessToken = password.MustGenerate(32, 10, 0, true, true)
	typ.PrevRefreshToken = typ.RefreshToken
	typ.RefreshToken = password.MustGenerate(32, 12, 0, true, true)

	// Set the rotated at time.
	typ.RotatedAt = time.Now()

	// Set the updated at time.
	typ.UpdatedAt = time.Now()

	return nil
}

func (typ *Token) RotationAt(rotationInterval time.Duration) time.Time {
	if typ.RotatedAt.IsZero() {
		return typ.CreatedAt.Add(rotationInterval)
	}

	return typ.RotatedAt.Add(rotationInterval)
}

func (typ *Token) UpdateLastObservedAt(lastObservedAt time.Time) error {
	if lastObservedAt.Before(typ.LastObservedAt) {
		return errors.New(errors.TypeInvalidInput, ErrCodeTokenOlderLastObservedAt, "last observed at is before the current last observed at")
	}

	typ.LastObservedAt = lastObservedAt
	typ.UpdatedAt = time.Now()

	return nil
}

func (typ Token) MarshalBinary() ([]byte, error) {
	return json.Marshal(typ)
}

func (typ *Token) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, typ)
}

type TokenStore interface {
	// Create a new token.
	Create(context.Context, *StorableToken) error

	// Get an identity by userID.
	GetIdentityByUserID(context.Context, valuer.UUID) (*Identity, error)

	// Get a token by AccessToken.
	GetByAccessToken(context.Context, string) (*StorableToken, error)

	// Updates or doesn't update a token by access token or previous access token with update. The callback is run in a transaction.
	GetOrUpdateByAccessTokenOrPrevAccessToken(context.Context, string, func(context.Context, *StorableToken) error) error

	// Get a token by userID and refresh token.
	GetByUserIDAndRefreshToken(context.Context, valuer.UUID, string) (*StorableToken, error)

	// List all tokens by orgIDs.
	ListByOrgIDs(context.Context, []valuer.UUID) ([]*StorableToken, error)

	// List all tokens by orgID.
	ListByOrgID(context.Context, valuer.UUID) ([]*StorableToken, error)

	// List all tokens by userID.
	ListByUserID(context.Context, valuer.UUID) ([]*StorableToken, error)

	// Update a token.
	Update(context.Context, *StorableToken) error

	// Delete a token by access token.
	DeleteByAccessToken(context.Context, string) error

	// Delete many tokens by IDs.
	DeleteMany(context.Context, []valuer.UUID) error

	// Delete a token by userID.
	DeleteByUserID(context.Context, valuer.UUID) error

	// Update last observed at by access token.
	UpdateLastObservedAtByAccessToken(context.Context, []map[string]any) error
}
