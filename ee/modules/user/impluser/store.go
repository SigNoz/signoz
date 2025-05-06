package impluser

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	baseimpl "github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

type store struct {
	*baseimpl.Store
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) types.UserStore {
	baseStore := baseimpl.NewStore(sqlstore).(*baseimpl.Store)
	return &store{
		Store:    baseStore,
		sqlstore: sqlstore,
	}
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
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get domain from email")
	}
	return domain, nil
}
