package impluser

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	baseimpl "github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
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
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get domain from name")
	}
	return domain, nil
}

func (m *store) CreateAPIKey(ctx context.Context, orgID string, p *types.StorableAPIKey) (*types.StorableAPIKey, error) {
	p.ID = valuer.GenerateUUID()
	_, err := m.sqlstore.BunDB().NewInsert().
		Model(p).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to insert PAT in db, err: %v", zap.Error(err))
		return nil, err
	}

	// createdByUser, _ := m.GetUserByID(ctx, orgID, p.UserID)
	// if createdByUser == nil {
	// 	p.CreatedByUser = types.APIKeyUser{
	// 		NotFound: true,
	// 	}
	// } else {
	// 	p.CreatedByUser = types.APIKeyUser{
	// 		User: types.User{
	// 			Identifiable: types.Identifiable{
	// 				ID: createdByUser.ID,
	// 			},
	// 			DisplayName: createdByUser.DisplayName,
	// 			Email:       createdByUser.Email,
	// 			TimeAuditable: types.TimeAuditable{
	// 				CreatedAt: createdByUser.CreatedAt,
	// 				UpdatedAt: createdByUser.UpdatedAt,
	// 			},
	// 		},
	// 		NotFound: false,
	// 	}
	// }
	return p, nil
}

func (m *store) UpdateAPIKey(ctx context.Context, orgID string, p *types.StorableAPIKey, id valuer.UUID) error {
	_, err := m.sqlstore.BunDB().NewUpdate().
		Model(p).
		Column("role", "name", "updated_at", "updated_by_user_id").
		Where("id = ?", id.StringValue()).
		Where("org_id = ?", orgID).
		Where("revoked = false").
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to update PAT in db, err: %v", zap.Error(err))
		return errors.New(errors.TypeInternal, errors.CodeInternal, "failed to update PAT")
	}
	return nil
}

func (m *store) ListAPIKeys(ctx context.Context, orgID string) ([]*types.StorableAPIKey, error) {
	pats := []*types.StorableAPIKey{}
	if err := m.sqlstore.BunDB().NewSelect().
		Model(&pats).
		Where("revoked = false").
		Where("org_id = ?", orgID).
		Order("updated_at DESC").
		Scan(ctx); err != nil {
		zap.L().Error("Failed to fetch PATs err: %v", zap.Error(err))
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to fetch PATs")
	}

	return pats, nil
}

func (m *store) RevokeAPIKey(ctx context.Context, orgID string, id valuer.UUID, userID string) error {
	updatedAt := time.Now().Unix()
	_, err := m.sqlstore.BunDB().NewUpdate().
		Model(&types.StorableAPIKey{}).
		Set("revoked = ?", true).
		Set("updated_by_user_id = ?", userID).
		Set("updated_at = ?", updatedAt).
		Where("id = ?", id.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to revoke PAT in db, err: %v", zap.Error(err))
		return errors.New(errors.TypeInternal, errors.CodeInternal, "failed to revoke PAT")
	}
	return nil
}

func (m *store) GetAPIKeyByToken(ctx context.Context, token string) (*types.StorableAPIKey, error) {
	pats := []types.StorableAPIKey{}

	if err := m.sqlstore.BunDB().NewSelect().
		Model(&pats).
		Where("token = ?", token).
		Where("revoked = false").
		Scan(ctx); err != nil {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to fetch PAT")
	}

	if len(pats) != 1 {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("found zero or multiple PATs with same token, %s", token))
	}
	return &pats[0], nil

	// patWithUser := types.GettableAPIKey{
	// 	StorableAPIKey: pats[0],
	// }

	// return &patWithUser, nil
}

func (m *store) GetAPIKey(ctx context.Context, orgID string, id valuer.UUID) (*types.StorableAPIKey, error) {
	pats := []types.StorableAPIKey{}

	if err := m.sqlstore.BunDB().NewSelect().
		Model(&pats).
		Where("id = ?", id.StringValue()).
		Where("org_id = ?", orgID).
		Where("revoked = false").
		Scan(ctx); err != nil {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to fetch PAT")
	}

	if len(pats) != 1 {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "found zero or multiple PATs with same token")
	}

	return &pats[0], nil

	// patWithUser := types.GettableAPIKey{
	// 	StorableAPIKey: pats[0],
	// }

	// return &patWithUser, nil
}
