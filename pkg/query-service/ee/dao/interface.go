package dao

import (
	"context"

	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
)

type ModelDao interface {
	basedao.ModelDao
	DB() *sqlx.DB

	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, *model.ApiError)
	GetDomain(ctx context.Context, id string) (*model.OrgDomain, *model.ApiError)
	CreateDomain(ctx context.Context, d *model.OrgDomain) *model.ApiError
	UpdateDomain(ctx context.Context, domain *model.OrgDomain) *model.ApiError
	DeleteDomain(ctx context.Context, id string) *model.ApiError

	// fetch or create SAML user
	FetchOrRegisterSAMLUser(email, firstname, lastname string) (*basemodel.UserPayload, error)
}
