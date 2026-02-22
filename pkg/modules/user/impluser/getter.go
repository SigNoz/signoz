package impluser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store   types.UserStore
	flagger flagger.Flagger
}

func NewGetter(store types.UserStore, flagger flagger.Flagger) user.Getter {
	return &getter{store: store, flagger: flagger}
}

func (module *getter) GetRootUserByOrgID(ctx context.Context, orgID valuer.UUID) (*types.User, error) {
	return module.store.GetRootUserByOrgID(ctx, orgID)
}

func (module *getter) ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.User, error) {
	users, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// filter root users if feature flag `hide_root_users` is true
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	hideRootUsers := module.flagger.BooleanOrEmpty(ctx, flagger.FeatureHideRootUsers, evalCtx)

	if hideRootUsers {
		filteredUsers := users[:0]
		for _, u := range users {
			if !u.IsRoot {
				filteredUsers = append(filteredUsers, u)
			}
		}

		return filteredUsers, nil
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

func (module *getter) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.User, error) {
	user, err := module.store.GetByOrgIDAndID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (module *getter) Get(ctx context.Context, id valuer.UUID) (*types.User, error) {
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

func (module *getter) CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error) {
	count, err := module.store.CountByOrgID(ctx, orgID)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (module *getter) GetFactorPasswordByUserID(ctx context.Context, userID valuer.UUID) (*types.FactorPassword, error) {
	factorPassword, err := module.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return factorPassword, nil
}
