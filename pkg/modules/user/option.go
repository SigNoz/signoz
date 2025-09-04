package user

import "github.com/SigNoz/signoz/pkg/types"

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
