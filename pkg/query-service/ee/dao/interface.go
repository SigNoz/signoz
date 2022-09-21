package dao

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/ee/model"
	baseint "go.signoz.io/query-service/interfaces"
	basemodel "go.signoz.io/query-service/model"
)

type ModelDao interface {
	basedao.ModelDao

	// SetFlagProvider sets the feature lookup provider
	SetFlagProvider(flags baseint.FeatureLookup)

	DB() *sqlx.DB

	// auth methods
	PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, basemodel.BaseApiError)
	CanUsePassword(ctx context.Context, email string) (bool, basemodel.BaseApiError)

	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, basemodel.BaseApiError)
	GetDomain(ctx context.Context, id uuid.UUID) (*model.OrgDomain, basemodel.BaseApiError)
	CreateDomain(ctx context.Context, d *model.OrgDomain) basemodel.BaseApiError
	UpdateDomain(ctx context.Context, domain *model.OrgDomain) basemodel.BaseApiError
	DeleteDomain(ctx context.Context, id uuid.UUID) basemodel.BaseApiError
	GetDomainByEmail(ctx context.Context, email string) (*model.OrgDomain, basemodel.BaseApiError)
}
