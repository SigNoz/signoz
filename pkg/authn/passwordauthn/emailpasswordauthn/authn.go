package emailpasswordauthn

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ authn.PasswordAuthN = (*AuthN)(nil)

type AuthN struct {
	store authtypes.AuthNStore
}

func New(store authtypes.AuthNStore) *AuthN {
	return &AuthN{store: store}
}

func (a *AuthN) Authenticate(ctx context.Context, email string, password string, orgID valuer.UUID) (authtypes.Identity, error) {
	user, factorPassword, err := a.store.GetUserAndFactorPasswordByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		return authtypes.Identity{}, err
	}

	if !factorPassword.Equals(password) {
		return authtypes.Identity{}, errors.New(errors.TypeInvalidInput, types.ErrCodeIncorrectPassword, "invalid password")
	}

	return authtypes.Identity{
		UserID: user.ID,
		OrgID:  orgID,
		Email:  user.Email,
		Role:   user.Role,
	}, nil
}
