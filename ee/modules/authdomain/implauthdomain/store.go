package implauthdomain

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/ee/types"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) types.AuthDomainStore {
	return &store{sqlstore: sqlstore}
}

func (s *store) GetDomainByName(ctx context.Context, name string) (*types.StorableOrgDomain, error) {
	domain := new(types.StorableOrgDomain)
	err := s.sqlstore.BunDB().NewSelect().
		Model(domain).
		Where("name = ?", name).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, model.InternalError(err)
	}
	return domain, nil
}
