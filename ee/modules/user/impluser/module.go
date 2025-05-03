package impluser

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/ee/modules/authdomain"
	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/user"
	baseimpl "github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

// EnterpriseModule embeds the base module implementation
type Module struct {
	*baseimpl.Module // Embed the base module implementation

	authDomainModule authdomain.Module
}

func NewModule(store types.UserStore, authDomainModule authdomain.Module) user.Module {
	baseModule := baseimpl.NewModule(store).(*baseimpl.Module)
	return &Module{
		Module:           baseModule,
		authDomainModule: authDomainModule,
	}
}

func (m *Module) createUserForSAMLRequest(ctx context.Context, email string) (*types.User, error) {
	// get auth domain from email domain
	_, apierr := m.authDomainModule.GetAuthDomainByEmail(ctx, email)
	if apierr != nil {
		zap.L().Error("failed to get domain from email", zap.Error(apierr))
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to get domain from email")
	}

	// get name from email
	parts := strings.Split(email, "@")
	if len(parts) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}
	name := parts[0]

	user, err := types.NewUser(name, email, types.RoleViewer.String(), "orgId from domain")
	if err != nil {
		return nil, err
	}

	err = m.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	// password is not required for SSO login

	return user, nil
}

func (m *Module) PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (string, error) {
	users, err := m.GetUsersByEmail(ctx, email)
	if err != nil {
		zap.L().Error("failed to get user with email received from auth provider", zap.String("error", err.Error()))
		return "", err
	}
	userPayload := users[0]

	user := &types.User{}

	if userPayload == nil {
		newUser, err := m.createUserForSAMLRequest(ctx, email)
		user = newUser
		if err != nil {
			zap.L().Error("failed to create user with email received from auth provider", zap.Error(err))
			return "", err
		}
	} else {
		user = userPayload
	}

	tokenStore, err := m.GetJWTForUser(ctx, user)
	if err != nil {
		zap.L().Error("failed to generate token for SSO login user", zap.Error(err))
		return "", err
	}

	return fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		user.ID,
		tokenStore.RefreshJwt), nil
}

func (m *Module) CanUsePassword(ctx context.Context, email string) (bool, error) {
	domain, err := m.authDomainModule.GetAuthDomainByEmail(ctx, email)
	if err != nil {
		return false, err
	}

	if domain != nil && domain.SsoEnabled {
		// sso is enabled, check if the user has admin role
		users, err := m.GetUsersByEmail(ctx, email)
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
