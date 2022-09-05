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
	GetOrgDomain(ctx context.Context, id string) (*model.OrgDomain, *model.ApiError)
	FetchOrRegisterSAMLUser(email, firstname, lastname string) (*basemodel.UserPayload, error)
}
