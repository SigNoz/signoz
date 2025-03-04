package dao

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
)

type ModelDao interface {
	Queries
	Mutations
}

type Queries interface {
	GetInviteFromEmail(ctx context.Context, email string) (*types.Invite, *model.ApiError)
	GetInviteFromToken(ctx context.Context, token string) (*types.Invite, *model.ApiError)
	GetInvites(ctx context.Context, orgID string) ([]types.Invite, *model.ApiError)

	GetUser(ctx context.Context, id string) (*types.GettableUser, *model.ApiError)
	GetUserByEmail(ctx context.Context, email string) (*types.GettableUser, *model.ApiError)
	GetUsers(ctx context.Context) ([]types.GettableUser, *model.ApiError)
	GetUsersWithOpts(ctx context.Context, limit int) ([]types.GettableUser, *model.ApiError)

	GetGroup(ctx context.Context, id string) (*types.Group, *model.ApiError)
	GetGroupByName(ctx context.Context, name string) (*types.Group, *model.ApiError)
	GetGroups(ctx context.Context) ([]types.Group, *model.ApiError)

	GetOrgs(ctx context.Context) ([]types.Organization, *model.ApiError)
	GetOrgByName(ctx context.Context, name string) (*types.Organization, *model.ApiError)
	GetOrg(ctx context.Context, id string) (*types.Organization, *model.ApiError)

	GetResetPasswordEntry(ctx context.Context, token string) (*types.ResetPasswordRequest, *model.ApiError)
	GetUsersByOrg(ctx context.Context, orgId string) ([]types.GettableUser, *model.ApiError)
	GetUsersByGroup(ctx context.Context, groupId string) ([]types.GettableUser, *model.ApiError)

	GetApdexSettings(ctx context.Context, orgID string, services []string) ([]types.ApdexSettings, *model.ApiError)

	GetIngestionKeys(ctx context.Context) ([]model.IngestionKey, *model.ApiError)

	PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, model.BaseApiError)
}

type Mutations interface {
	CreateInviteEntry(ctx context.Context, req *types.Invite) *model.ApiError
	DeleteInvitation(ctx context.Context, orgID string, email string) *model.ApiError

	CreateUser(ctx context.Context, user *types.User, isFirstUser bool) (*types.User, *model.ApiError)
	EditUser(ctx context.Context, update *types.User) (*types.User, *model.ApiError)
	DeleteUser(ctx context.Context, id string) *model.ApiError

	CreateGroup(ctx context.Context, group *types.Group) (*types.Group, *model.ApiError)
	DeleteGroup(ctx context.Context, id string) *model.ApiError

	CreateOrg(ctx context.Context, org *types.Organization) (*types.Organization, *model.ApiError)
	EditOrg(ctx context.Context, org *types.Organization) *model.ApiError
	DeleteOrg(ctx context.Context, id string) *model.ApiError

	CreateResetPasswordEntry(ctx context.Context, req *types.ResetPasswordRequest) *model.ApiError
	DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError

	UpdateUserPassword(ctx context.Context, hash, userId string) *model.ApiError
	UpdateUserGroup(ctx context.Context, userId, groupId string) *model.ApiError

	SetApdexSettings(ctx context.Context, orgID string, set *types.ApdexSettings) *model.ApiError

	InsertIngestionKey(ctx context.Context, ingestionKey *model.IngestionKey) *model.ApiError
}
