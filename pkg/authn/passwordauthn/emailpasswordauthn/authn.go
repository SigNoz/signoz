package emailpasswordauthn

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ authn.PasswordAuthN = (*AuthN)(nil)

type AuthN struct {
	store         authtypes.AuthNStore
	userRoleStore authtypes.UserRoleStore
	authz         authz.AuthZ
}

func New(store authtypes.AuthNStore, userRoleStore authtypes.UserRoleStore, authz authz.AuthZ) *AuthN {
	return &AuthN{store: store, userRoleStore: userRoleStore, authz: authz}
}

func (a *AuthN) Authenticate(ctx context.Context, email string, password string, orgID valuer.UUID) (*authtypes.Identity, error) {
	user, factorPassword, err := a.store.GetActiveUserAndFactorPasswordByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		return nil, err
	}

	if !factorPassword.Equals(password) {
		return nil, errors.New(errors.TypeUnauthenticated, types.ErrCodeIncorrectPassword, "invalid email or password")
	}

	roleNames, err := a.resolveRoleNamesForUser(ctx, user.ID, user.OrgID)
	if err != nil {
		return nil, err
	}

	role := authtypes.SigNozManagedRoleToExistingLegacyRole[roleNames[0]]

	return authtypes.NewIdentity(user.ID, orgID, user.Email, role, authtypes.IdentNProviderTokenizer), nil
}

func (a *AuthN) resolveRoleNamesForUser(ctx context.Context, userID valuer.UUID, orgID valuer.UUID) ([]string, error) {
	storableUserRoles, err := a.userRoleStore.GetUserRolesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	roleIDs := make([]valuer.UUID, len(storableUserRoles))
	for idx, sur := range storableUserRoles {
		roleIDs[idx] = sur.RoleID
	}

	roles, err := a.authz.ListByOrgIDAndIDs(ctx, orgID, roleIDs)
	if err != nil {
		return nil, err
	}

	roleNames := make([]string, len(roles))
	for idx, role := range roles {
		roleNames[idx] = role.Name
	}

	return roleNames, nil
}
