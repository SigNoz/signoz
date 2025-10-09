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
	users, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (module *getter) GetUsersByEmail(ctx context.Context, email valuer.Email) ([]*types.User, error) {
	users, err := module.store.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (module *getter) GetUser(ctx context.Context, id valuer.UUID) (*types.User, error) {
	user, err := module.store.GetUser(ctx, id)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (module *getter) ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	users, err := module.store.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
	if err != nil {
		return nil, err
	}

	return users, nil
}
