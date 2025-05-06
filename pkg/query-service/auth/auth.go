package auth

import (
	"context"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
)

func RegisterOrgAndFirstUser(ctx context.Context, req *types.PostableRegisterOrgAndAdmin, organizationModule organization.Module, userModule user.Module) (*types.User, *model.ApiError) {
	if req.Email == "" {
		return nil, model.BadRequest(model.ErrEmailRequired{})
	}

	if req.Password == "" {
		return nil, model.BadRequest(model.ErrPasswordRequired{})
	}

	organization := types.NewOrganization(req.OrgDisplayName)
	err := organizationModule.Create(ctx, organization)
	if err != nil {
		return nil, model.InternalError(err)
	}

	user, err := types.NewUser(req.Name, req.Email, types.RoleAdmin.String(), organization.ID.StringValue())
	if err != nil {
		return nil, model.InternalError(err)
	}

	password, err := types.NewFactorPassword(req.Password)
	if err != nil {
		return nil, model.InternalError(err)
	}

	user, err = userModule.CreateUserWithPassword(ctx, user, password)
	if err != nil {
		return nil, model.InternalError(err)
	}

	return user, nil
}

// First user registration
func Register(ctx context.Context, req *types.PostableRegisterOrgAndAdmin, alertmanager alertmanager.Alertmanager, organizationModule organization.Module, userModule user.Module, quickfiltermodule quickfilter.Usecase) (*types.User, *model.ApiError) {
	user, err := RegisterOrgAndFirstUser(ctx, req, organizationModule, userModule)
	if err != nil {
		return nil, err
	}

	if err := alertmanager.SetDefaultConfig(ctx, user.OrgID); err != nil {
		return nil, model.InternalError(err)
	}

	if err := quickfiltermodule.SetDefaultConfig(ctx, valuer.MustNewUUID(user.OrgID)); err != nil {
		return nil, model.InternalError(err)
	}

	return user, nil
}
