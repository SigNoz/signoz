package dao

import (
	"context"
	"net/url"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	basedao "go.signoz.io/signoz/pkg/query-service/dao"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type ModelDao interface {
	basedao.ModelDao

	// SetFlagProvider sets the feature lookup provider
	SetFlagProvider(flags baseint.FeatureLookup)

	DB() *sqlx.DB

	// auth methods
	PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, basemodel.BaseApiError)
	CanUsePassword(ctx context.Context, email string) (bool, basemodel.BaseApiError)
	PrepareSsoRedirect(ctx context.Context, redirectUri, email string) (redirectURL string, apierr basemodel.BaseApiError)
	GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*model.OrgDomain, error)
	
	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, basemodel.BaseApiError)
	GetDomain(ctx context.Context, id uuid.UUID) (*model.OrgDomain, basemodel.BaseApiError)
	CreateDomain(ctx context.Context, d *model.OrgDomain) basemodel.BaseApiError
	UpdateDomain(ctx context.Context, domain *model.OrgDomain) basemodel.BaseApiError
	DeleteDomain(ctx context.Context, id uuid.UUID) basemodel.BaseApiError
	GetDomainByEmail(ctx context.Context, email string) (*model.OrgDomain, basemodel.BaseApiError)
}
