package auth

import (
	"context"

	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/pkg/errors"
)

func GetUserFromReqContext(ctx context.Context) (*types.GettableUser, error) {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "no claims found in context")
	}

	user := &types.GettableUser{
		User: types.User{
			ID:    claims.UserID,
			Role:  claims.Role,
			Email: claims.Email,
			OrgID: claims.OrgID,
		},
	}
	return user, nil
}

func IsSelfAccessRequest(user *types.GettableUser, id string) bool { return user.ID == id }

func IsViewer(user *types.GettableUser) bool {
	return user.Role == authtypes.RoleViewer
}
func IsEditor(user *types.GettableUser) bool {
	return user.Role == authtypes.RoleEditor
}
func IsAdmin(user *types.GettableUser) bool {
	return user.Role == authtypes.RoleAdmin
}

func IsAdminV2(claims authtypes.Claims) bool {
	return claims.Role == authtypes.RoleAdmin
}

func ValidatePassword(password string) error {
	if len(password) < minimumPasswordLength {
		return errors.Errorf("Password should be atleast %d characters.", minimumPasswordLength)
	}
	return nil
}
