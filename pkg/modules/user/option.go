package user

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type createUserOptions struct {
	FactorPassword *types.FactorPassword
	RoleNames      []string
	RoleIDs        []valuer.UUID
}

type CreateUserOption func(*createUserOptions)

func WithFactorPassword(factorPassword *types.FactorPassword) CreateUserOption {
	return func(o *createUserOptions) {
		o.FactorPassword = factorPassword
	}
}

func WithRoleNames(roleNames []string) CreateUserOption {
	return func(o *createUserOptions) {
		o.RoleNames = roleNames
	}
}

func WithRoleIDs(roleIDs []valuer.UUID) CreateUserOption {
	return func(o *createUserOptions) {
		o.RoleIDs = roleIDs
	}
}

func NewCreateUserOptions(opts ...CreateUserOption) *createUserOptions {
	o := &createUserOptions{
		FactorPassword: nil,
		RoleNames:      nil,
	}

	for _, opt := range opts {
		opt(o)
	}

	return o
}

type authenticateOptions struct {
	OrgID valuer.UUID
}

type AuthenticateOption func(*authenticateOptions)

func WithOrgID(orgID valuer.UUID) AuthenticateOption {
	return func(o *authenticateOptions) {
		o.OrgID = orgID
	}
}

func NewAuthenticateOptions(opts ...AuthenticateOption) *authenticateOptions {
	o := &authenticateOptions{
		OrgID: valuer.UUID{},
	}

	for _, opt := range opts {
		opt(o)
	}

	return o
}
