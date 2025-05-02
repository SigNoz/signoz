package impluser

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/user"
	baseimpl "github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"go.uber.org/zap"
)

// EnterpriseModule embeds the base module implementation
type Module struct {
	*baseimpl.Module // Embed the base module implementation
}

func NewModule(store types.UserStore) user.Module {
	baseModule := baseimpl.NewModule(store).(*baseimpl.Module)
	return &Module{
		Module: baseModule,
	}
}

func (m *Module) CreateUserForSAMLRequest(ctx context.Context, email string) (*types.User, error) {

	// get auth domain from email domain
	// domain, apierr := m.GetDomainByEmail(ctx, email)
	// if apierr != nil {
	// 	zap.L().Error("failed to get domain from email", zap.Error(apierr))
	// 	return nil, model.InternalErrorStr("failed to get domain from email")
	// }
	// if domain == nil {
	// 	zap.L().Error("email domain does not match any authenticated domain", zap.String("email", email))
	// 	return nil, model.InternalErrorStr("email domain does not match any authenticated domain")
	// }

	// get name from email
	parts := strings.Split(email, "@")
	if len(parts) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}
	name := parts[0]

	user, err := types.NewUser(name, email, types.RoleViewer.String(), "orgId from domain")
	if err != nil {
		zap.L().Error("failed to create user", zap.Error(err))
		return nil, model.InternalErrorStr("failed to create user")
	}

	// password is not required for SSO login
	err = m.CreateUser(ctx, user)
	if err != nil {
		zap.L().Error("failed to create user", zap.Error(err))
		return nil, model.InternalErrorStr("failed to create user")
	}

	return user, nil
}
