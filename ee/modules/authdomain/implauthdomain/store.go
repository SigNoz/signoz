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

// CreateBulkInvite implements types.InviteStore.
// func (s *store) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
// 	_, err := s.sqlstore.BunDB().NewInsert().
// 		Model(invites).
// 		Exec(ctx)

// 	if err != nil {
// 		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrInviteAlreadyExists, "invite with email: %s already exists in org: %s", invites[0].Email, invites[0].OrgID)
// 	}
// 	return nil
// }
