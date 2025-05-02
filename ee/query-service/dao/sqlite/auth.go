package sqlite

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/ee/query-service/model"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

func (m *modelDao) createUserForSAMLRequest(ctx context.Context, email string) (*types.User, basemodel.BaseApiError) {
	// get auth domain from email domain
	domain, apierr := m.GetDomainByEmail(ctx, email)
	if apierr != nil {
		zap.L().Error("failed to get domain from email", zap.Error(apierr))
		return nil, model.InternalErrorStr("failed to get domain from email")
	}
	if domain == nil {
		zap.L().Error("email domain does not match any authenticated domain", zap.String("email", email))
		return nil, model.InternalErrorStr("email domain does not match any authenticated domain")
	}

	parts := strings.Split(email, "@")
	if len(parts) < 2 {
		zap.L().Error("invalid email format", zap.String("email", email))
		return nil, model.BadRequestStr("invalid email format")
	}
	name := parts[0]

	user, err := types.NewUser(name, email, types.RoleViewer.String(), domain.OrgID)
	if err != nil {
		zap.L().Error("failed to create user", zap.Error(err))
		return nil, model.InternalErrorStr("failed to create user")
	}

	// password is not required for SSO login
	err = m.userModule.CreateUser(ctx, user)
	if err != nil {
		zap.L().Error("failed to create user", zap.Error(err))
		return nil, model.InternalErrorStr("failed to create user")
	}

	return user, nil

}

// PrepareSsoRedirect prepares redirect page link after SSO response
// is successfully parsed (i.e. valid email is available)
func (m *modelDao) PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (redirectURL string, apierr basemodel.BaseApiError) {

	users, err := m.userModule.GetUsersByEmail(ctx, email)
	if err != nil {
		zap.L().Error("failed to get user with email received from auth provider", zap.String("error", err.Error()))
		return "", model.BadRequestStr("invalid user email received from the auth provider")
	}
	userPayload := users[0]

	user := &types.User{}

	if userPayload == nil {
		newUser, apiErr := m.createUserForSAMLRequest(ctx, email)
		user = newUser
		if apiErr != nil {
			zap.L().Error("failed to create user with email received from auth provider", zap.Error(apiErr))
			return "", apiErr
		}
	} else {
		user = userPayload
	}

	tokenStore, err := m.userModule.GetJWTForUser(ctx, user)
	if err != nil {
		zap.L().Error("failed to generate token for SSO login user", zap.Error(err))
		return "", model.InternalErrorStr("failed to generate token for the user")
	}

	return fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		user.ID,
		tokenStore.RefreshJwt), nil
}

func (m *modelDao) CanUsePassword(ctx context.Context, email string) (bool, basemodel.BaseApiError) {
	domain, apierr := m.GetDomainByEmail(ctx, email)
	if apierr != nil {
		return false, apierr
	}

	if domain != nil && domain.SsoEnabled {
		// sso is enabled, check if the user has admin role
		users, err := m.userModule.GetUsersByEmail(ctx, email)
		if err != nil {
			return false, model.BadRequest(fmt.Errorf("failed to get user by email"))
		}
		userPayload := users[0]

		if userPayload == nil {
			return false, model.BadRequest(fmt.Errorf("auth method not supported"))
		}

		if userPayload.Role != types.RoleAdmin.String() {
			return false, model.BadRequest(fmt.Errorf("auth method not supported"))
		}

	}

	return true, nil
}
