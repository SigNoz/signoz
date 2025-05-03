package authdomain

import (
	"context"

	"github.com/SigNoz/signoz/ee/types"
)

type Module interface {
	GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error)
}
type Handler interface {
}
