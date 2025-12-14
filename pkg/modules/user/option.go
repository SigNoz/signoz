package user

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type createUserOptions struct {
	FactorPassword *types.FactorPassword
}

type CreateUserOption func(*createUserOptions)

func WithFactorPassword(factorPassword *types.FactorPassword) CreateUserOption {
	return func(o *createUserOptions) {
		o.FactorPassword = factorPassword
	}
}

func NewCreateUserOptions(opts ...CreateUserOption) *createUserOptions {
	o := &createUserOptions{
		FactorPassword: nil,
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
