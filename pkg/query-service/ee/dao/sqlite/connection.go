package sqlite

import (
	"context"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	basedao "go.signoz.io/query-service/dao"
	basedsql "go.signoz.io/query-service/dao/sqlite"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
)

type modelDao struct {
	*basedsql.ModelDaoSqlite
}

// InitDB creates and extends base model DB repository
func InitDB(dataSourceName string) (*modelDao, error) {
	dao, err := basedsql.InitDB(dataSourceName)
	if err != nil {
		return nil, err
	}
	// set package variable so dependent base methods (e.g. AuthCache)  will work
	basedao.SetDB(dao)
	return &modelDao{
		dao,
	}, nil
}

func (m *modelDao) DB() *sqlx.DB {
	return m.ModelDaoSqlite.DB()
}

// GetOrgDomain returns org domain given a domain ID
func (m *modelDao) GetOrgDomain(ctx context.Context, id string) (*model.OrgDomain, *model.ApiError) {

	orgDomain := model.OrgDomain{}
	err := m.DB().Get(&orgDomain, `SELECT * FROM organizations WHERE id=$1 LIMIT 1`, id)

	if err != nil {
		return nil, model.NewInternalError(err)
	}

	return &orgDomain, nil
}

// RegisterOrFetchSAMLUser gets or creates a new user from a SAML response
func (m *modelDao) FetchOrRegisterSAMLUser(email, firstname, lastname string) (*basemodel.UserPayload, error) {
	userPayload, err := m.GetUserByEmail(context.Background(), email)
	if err != nil {
		return nil, errors.Wrap(err.Err, "user not found")
	}
	// todo(amol) : Need to implement user creation
	return userPayload, nil
}
