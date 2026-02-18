package user

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type createUserOptions struct {
	FactorPassword *types.FactorPassword
	Role           types.Role
}

type CreateUserOption func(*createUserOptions)

func WithFactorPassword(factorPassword *types.FactorPassword) CreateUserOption {
	return func(o *createUserOptions) {
		o.FactorPassword = factorPassword
	}
}

func WithRole(role types.Role) CreateUserOption {
	return func(o *createUserOptions) {
		o.Role = role
	}
}

func NewCreateUserOptions(opts ...CreateUserOption) *createUserOptions {
	o := &createUserOptions{
		FactorPassword: nil,
		Role:           types.RoleViewer, // default role
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
