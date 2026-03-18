package impluser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store types.UserStore
}

func NewGetter(store types.UserStore) user.Getter {
	return &getter{store: store}
}

func (module *getter) ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.User, error) {
	storableUsers, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// we are not resolving roles for getter methods
	users := make([]*types.User, len(storableUsers))
	for idx, storableUser := range storableUsers {
		users[idx] = types.NewUserFromStorable(storableUser, make([]string, 0))
	}

	return users, nil
}

func (module *getter) Get(ctx context.Context, id valuer.UUID) (*types.User, error) {
	storableUser, err := module.store.GetUser(ctx, id)
	if err != nil {
		return nil, err
	}

	return types.NewUserFromStorable(storableUser, make([]string, 0)), nil
}

func (module *getter) ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	storableUsers, err := module.store.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
	if err != nil {
		return nil, err
	}

	users := make([]*types.User, len(storableUsers))

	for idx, storableUser := range storableUsers {
		users[idx] = types.NewUserFromStorable(storableUser, make([]string, 0))
	}

	return users, nil
}

func (module *getter) CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error) {
	count, err := module.store.CountByOrgID(ctx, orgID)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (module *getter) CountByOrgIDAndStatuses(ctx context.Context, orgID valuer.UUID, statuses []string) (map[valuer.String]int64, error) {
	counts, err := module.store.CountByOrgIDAndStatuses(ctx, orgID, statuses)
	if err != nil {
		return nil, err
	}

	return counts, nil
}

func (module *getter) GetFactorPasswordByUserID(ctx context.Context, userID valuer.UUID) (*types.FactorPassword, error) {
	factorPassword, err := module.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return factorPassword, nil
}
