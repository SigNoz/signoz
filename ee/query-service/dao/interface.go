package dao

import (
	"context"
	"net/url"

	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/google/uuid"
)

type ModelDao interface {
	// auth methods
	GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*types.GettableOrgDomain, error)

	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]types.GettableOrgDomain, basemodel.BaseApiError)
	GetDomain(ctx context.Context, id uuid.UUID) (*types.GettableOrgDomain, basemodel.BaseApiError)
	CreateDomain(ctx context.Context, d *types.GettableOrgDomain) basemodel.BaseApiError
	UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) basemodel.BaseApiError
	DeleteDomain(ctx context.Context, id uuid.UUID) basemodel.BaseApiError
	GetDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, basemodel.BaseApiError)
}
