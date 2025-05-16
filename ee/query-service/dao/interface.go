package dao

import (
	"context"
	"net/url"

	basedao "github.com/SigNoz/signoz/pkg/query-service/dao"
	baseint "github.com/SigNoz/signoz/pkg/query-service/interfaces"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type ModelDao interface {
	basedao.ModelDao

	// SetFlagProvider sets the feature lookup provider
	SetFlagProvider(flags baseint.FeatureLookup)

	DB() *bun.DB

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
