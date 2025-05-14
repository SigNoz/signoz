package dao

import (
	"context"
	"net/url"

	eeTypes "github.com/SigNoz/signoz/ee/types"
	basedao "github.com/SigNoz/signoz/pkg/query-service/dao"
	baseint "github.com/SigNoz/signoz/pkg/query-service/interfaces"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
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

	CreatePAT(ctx context.Context, orgID string, p eeTypes.GettablePAT) (eeTypes.GettablePAT, basemodel.BaseApiError)
	UpdatePAT(ctx context.Context, orgID string, p eeTypes.GettablePAT, id valuer.UUID) basemodel.BaseApiError
	GetPAT(ctx context.Context, pat string) (*eeTypes.GettablePAT, basemodel.BaseApiError)
	GetPATByID(ctx context.Context, orgID string, id valuer.UUID) (*eeTypes.GettablePAT, basemodel.BaseApiError)
	ListPATs(ctx context.Context, orgID string) ([]eeTypes.GettablePAT, basemodel.BaseApiError)
	RevokePAT(ctx context.Context, orgID string, id valuer.UUID, userID string) basemodel.BaseApiError
}
