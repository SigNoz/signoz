package dao

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/ee/model"
)

type ModelDao interface {
	basedao.ModelDao
	DB() *sqlx.DB

	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, *model.ApiError)
	GetDomain(ctx context.Context, id uuid.UUID) (*model.OrgDomain, *model.ApiError)
	CreateDomain(ctx context.Context, d *model.OrgDomain) *model.ApiError
	UpdateDomain(ctx context.Context, domain *model.OrgDomain) *model.ApiError
	DeleteDomain(ctx context.Context, id uuid.UUID) *model.ApiError
	GetDomainByEmail(ctx context.Context, email string) (*model.OrgDomain, *model.ApiError)
}
