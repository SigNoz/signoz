package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	basedao "go.signoz.io/query-service/dao"
	basedsql "go.signoz.io/query-service/dao/sqlite"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
	"go.uber.org/zap"
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
	m := &modelDao{
		dao,
	}

	table_schema := `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS org_domains(
		id TEXT PRIMARY KEY,
		org_id TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER,
		data TEXT  NOT NULL,
		FOREIGN KEY(org_id) REFERENCES organizations(id)
	);`

	_, err = m.DB().Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating tables: %v", err.Error())
	}

	return m, nil
}

func (m *modelDao) DB() *sqlx.DB {
	return m.ModelDaoSqlite.DB()
}

// StoredDomain represents stored database record for org domain
type StoredDomain struct {
	Id        uuid.UUID `db:"id"`
	OrgId     uuid.UUID `db:"org_id"`
	Data      string    `db:"data"`
	CreatedAt int64     `db:"created_at"`
	UpdatedAt int64     `db:"updated_at"`
}

// GetDomain returns org domain for a given domain id
func (m *modelDao) GetDomain(ctx context.Context, id string) (*model.OrgDomain, *model.ApiError) {

	stored := StoredDomain{}
	err := m.DB().Get(&stored, `SELECT * FROM org_domains WHERE id=$1 LIMIT 1`, id)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain id"))
		}
		return nil, model.InternalError(err)
	}

	domain := &model.OrgDomain{Id: stored.Id, OrgId: stored.OrgId}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return domain, model.InternalError(err)
	}
	return domain, nil
}

// ListDomains gets the list of auth domains by org id
func (m *modelDao) ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, *model.ApiError) {
	domains := []model.OrgDomain{}

	stored := []StoredDomain{}
	err := m.DB().SelectContext(ctx, &stored, `SELECT * FROM org_domains WHERE org_id=$1`, orgId)

	if err != nil {
		if err == sql.ErrNoRows {
			return []model.OrgDomain{}, nil
		}
		return nil, model.InternalError(err)
	}

	for _, s := range stored {
		domain := model.OrgDomain{Id: s.Id, OrgId: s.OrgId}
		if err := domain.LoadConfig(s.Data); err != nil {
			zap.S().Errorf("ListDomains() failed", zap.Error(err))
		}
		domains = append(domains, domain)
	}

	return domains, nil
}

// CreateDomain creates  a new auth domain
func (m *modelDao) CreateDomain(ctx context.Context, domain *model.OrgDomain) *model.ApiError {

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.S().Errorf("failed to unmarshal domain config", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	_, err = m.DB().ExecContext(ctx,
		"INSERT INTO org_domains (id, org_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
		domain.Id,
		domain.OrgId,
		configJson,
		time.Now().Unix(),
		time.Now().Unix())

	if err != nil {
		zap.S().Errorf("failed to insert domain in db", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	return nil
}

// UpdateDomain updates stored config params for a domain
func (m *modelDao) UpdateDomain(ctx context.Context, domain *model.OrgDomain) *model.ApiError {

	if domain.Id == uuid.Nil {
		zap.S().Errorf("domain update failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.S().Errorf("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	_, err = m.DB().ExecContext(ctx,
		"UPDATE org_domains SET data = $1, updated_at = $2 WHERE id = $3",
		configJson,
		time.Now().Unix(),
		domain.Id)

	if err != nil {
		zap.S().Errorf("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	return nil
}

// DeleteDomain creates  a new auth domain
func (m *modelDao) DeleteDomain(ctx context.Context, id string) *model.ApiError {
	return model.InternalError(fmt.Errorf("unimplemented"))
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
