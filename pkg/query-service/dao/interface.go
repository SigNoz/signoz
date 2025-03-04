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
	GetInviteFromEmail(ctx context.Context, email string) (*model.InvitationObject, *model.ApiError)
	GetInviteFromToken(ctx context.Context, token string) (*model.InvitationObject, *model.ApiError)
	GetInvites(ctx context.Context) ([]model.InvitationObject, *model.ApiError)

	GetUser(ctx context.Context, id string) (*model.UserPayload, *model.ApiError)
	GetUserByEmail(ctx context.Context, email string) (*model.UserPayload, *model.ApiError)
	GetUsers(ctx context.Context) ([]model.UserPayload, *model.ApiError)
	GetUsersWithOpts(ctx context.Context, limit int) ([]model.UserPayload, *model.ApiError)

	GetGroup(ctx context.Context, id string) (*model.Group, *model.ApiError)
	GetGroupByName(ctx context.Context, name string) (*types.Group, *model.ApiError)
	GetGroups(ctx context.Context) ([]model.Group, *model.ApiError)

	GetOrgs(ctx context.Context) ([]model.Organization, *model.ApiError)
	GetOrgByName(ctx context.Context, name string) (*model.Organization, *model.ApiError)
	GetOrg(ctx context.Context, id string) (*model.Organization, *model.ApiError)

	GetResetPasswordEntry(ctx context.Context, token string) (*model.ResetPasswordEntry, *model.ApiError)
	GetUsersByOrg(ctx context.Context, orgId string) ([]model.UserPayload, *model.ApiError)
	GetUsersByGroup(ctx context.Context, groupId string) ([]model.UserPayload, *model.ApiError)

	GetApdexSettings(ctx context.Context, services []string) ([]model.ApdexSettings, *model.ApiError)

	GetIngestionKeys(ctx context.Context) ([]model.IngestionKey, *model.ApiError)

	PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, model.BaseApiError)
}

type Mutations interface {
	CreateInviteEntry(ctx context.Context, req *model.InvitationObject) *model.ApiError
	DeleteInvitation(ctx context.Context, email string) *model.ApiError

	CreateUser(ctx context.Context, user *model.User, isFirstUser bool) (*model.User, *model.ApiError)
	EditUser(ctx context.Context, update *model.User) (*model.User, *model.ApiError)
	DeleteUser(ctx context.Context, id string) *model.ApiError

	UpdateUserFlags(ctx context.Context, userId string, flags map[string]string) (model.UserFlag, *model.ApiError)

	CreateGroup(ctx context.Context, group *types.Group) (*types.Group, *model.ApiError)
	DeleteGroup(ctx context.Context, id string) *model.ApiError

	CreateOrg(ctx context.Context, org *model.Organization) (*model.Organization, *model.ApiError)
	EditOrg(ctx context.Context, org *model.Organization) *model.ApiError
	DeleteOrg(ctx context.Context, id string) *model.ApiError

	CreateResetPasswordEntry(ctx context.Context, req *model.ResetPasswordEntry) *model.ApiError
	DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError

	UpdateUserPassword(ctx context.Context, hash, userId string) *model.ApiError
	UpdateUserGroup(ctx context.Context, userId, groupId string) *model.ApiError

	SetApdexSettings(ctx context.Context, set *model.ApdexSettings) *model.ApiError

	InsertIngestionKey(ctx context.Context, ingestionKey *model.IngestionKey) *model.ApiError
}
