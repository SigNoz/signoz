package authtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/sethvargo/go-password/password"
)

var (
	ErrCodeTokenRotationRequired = errors.MustNewCode("token_rotation_required")
	ErrCodeTokenExpired          = errors.MustNewCode("token_expired")
	ErrCodeTokenNotFound         = errors.MustNewCode("token_not_found")
)

var _ cachetypes.Cacheable = (*Token)(nil)

type StorableToken = Token

type Token struct {
	ID             valuer.UUID
	Meta           map[string]string
	AccessToken    string
	RefreshToken   string
	LastObservedAt time.Time `bun:"last_observed_at,nullzero"`
	RotatedAt      time.Time `bun:"rotated_at,nullzero"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	UserID         valuer.UUID
}

func NewToken(meta map[string]string, userID valuer.UUID) (*Token, error) {
	accessToken := password.MustGenerate(32, 10, 0, true, false)
	refreshToken := password.MustGenerate(32, 1, 0, true, false)

	return &Token{
		ID:             valuer.GenerateUUID(),
		Meta:           meta,
		AccessToken:    accessToken,
		RefreshToken:   refreshToken,
		LastObservedAt: time.Time{},
		RotatedAt:      time.Time{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		UserID:         userID,
	}, nil
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
	if typ.LastObservedAt.Before(time.Now().Add(-idleDuration)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenExpired, "token has not been used for too long")
	}

	// If now - created_at > max_duration, the token will be considered as expired.
	if typ.CreatedAt.Before(time.Now().Add(-maxDuration)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenExpired, "token was created a long time ago")
	}

	return nil
}

func (typ *Token) IsRotationRequired(rotationInterval time.Duration) error {
	if typ.RotatedAt.Before(time.Now().Add(-rotationInterval)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTokenRotationRequired, "token needs to be rotated")
	}

	return nil
}

func (typ *Token) Rotate() error {
	// Generate new access and refresh tokens.
	typ.AccessToken = password.MustGenerate(32, 10, 0, true, false)
	typ.RefreshToken = password.MustGenerate(32, 1, 0, true, false)

	// Reset the last observed at time.
	typ.LastObservedAt = time.Time{}

	// Set the rotated at time.
	typ.RotatedAt = time.Now()

	// Set the updated at time.
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

	// Get an authenticated user by userID.
	GetAuthenticatedUserByUserID(context.Context, valuer.UUID) (*AuthenticatedUser, error)

	// Get a token by AccessToken.
	GetByAccessToken(context.Context, string) (*StorableToken, error)

	// List all tokens.
	ListByOwnedKeyRange(context.Context, uint32, uint32) ([]*StorableToken, error)

	// List all tokens by orgID.
	ListByOrgID(context.Context, valuer.UUID) ([]*StorableToken, error)

	// Update a token.
	Update(context.Context, *StorableToken) error

	// Delete a token by access token.
	DeleteByAccessToken(context.Context, string) error

	// Delete many tokens by IDs.
	DeleteMany(context.Context, []valuer.UUID) error
}
