package impluser

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store         types.UserStore
	userRoleStore authtypes.UserRoleStore
	flagger       flagger.Flagger
}

func NewGetter(store types.UserStore, userRoleStore authtypes.UserRoleStore, flagger flagger.Flagger) user.Getter {
	return &getter{store: store, userRoleStore: userRoleStore, flagger: flagger}
}

func (module *getter) GetRootUserByOrgID(ctx context.Context, orgID valuer.UUID) (*types.User, []*authtypes.UserRole, error) {
	rootUser, err := module.store.GetRootUserByOrgID(ctx, orgID)
	if err != nil {
		return nil, nil, err
	}

	userRoles, err := module.userRoleStore.GetUserRolesByUserID(ctx, rootUser.ID)
	if err != nil {
		return nil, nil, err
	}

	return rootUser, userRoles, nil
}

func (module *getter) ListDeprecatedUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.DeprecatedUser, error) {
	users, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// filter root users if feature flag `hide_root_users` is true
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	hideRootUsers := module.flagger.BooleanOrEmpty(ctx, flagger.FeatureHideRootUser, evalCtx)

	if hideRootUsers {
		users = slices.DeleteFunc(users, func(user *types.User) bool { return user.IsRoot })
	}

	userIDs := make([]valuer.UUID, len(users))
	for idx, user := range users {
		userIDs[idx] = user.ID
	}

	userRoles, err := module.userRoleStore.ListUserRolesByOrgIDAndUserIDs(ctx, orgID, userIDs)
	if err != nil {
		return nil, err
	}

	// Build userID → role name mapping directly from the joined Role
	userIDToRoleNames := make(map[valuer.UUID][]string)
	for _, ur := range userRoles {
		if ur.Role != nil {
			userIDToRoleNames[ur.UserID] = append(userIDToRoleNames[ur.UserID], ur.Role.Name)
		}
	}

	deprecatedUsers := make([]*types.DeprecatedUser, 0, len(users))
	for _, user := range users {
		roleNames := userIDToRoleNames[user.ID]

		if len(roleNames) == 0 {
			return nil, errors.Newf(errors.TypeUnexpected, authtypes.ErrCodeUserRolesNotFound, "no user roles entries found for user: %s", user.ID.String())
		}

		role := authtypes.SigNozManagedRoleToExistingLegacyRole[roleNames[0]]
		deprecatedUsers = append(deprecatedUsers, types.NewDeprecatedUserFromUserAndRole(user, role))
	}

	return deprecatedUsers, nil
}

func (module *getter) ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.User, error) {
	users, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// filter root users if feature flag `hide_root_users` is true
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	hideRootUsers := module.flagger.BooleanOrEmpty(ctx, flagger.FeatureHideRootUser, evalCtx)

	if hideRootUsers {
		users = slices.DeleteFunc(users, func(user *types.User) bool { return user.IsRoot })
	}

	return users, nil
}

func (module *getter) GetDeprecatedUserByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.DeprecatedUser, error) {
	user, err := module.store.GetByOrgIDAndID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	userRoles, err := module.GetRolesByUserID(ctx, id)
	if err != nil {
		return nil, err
	}

	if len(userRoles) == 0 {
		return nil, errors.New(errors.TypeUnexpected, authtypes.ErrCodeUserRolesNotFound, "no user roles entries found")
	}

	if userRoles[0].Role == nil {
		return nil, errors.New(errors.TypeUnexpected, authtypes.ErrCodeRoleNotFound, "role not found for user role entry")
	}

	role := authtypes.SigNozManagedRoleToExistingLegacyRole[userRoles[0].Role.Name]

	return types.NewDeprecatedUserFromUserAndRole(user, role), nil
}

func (module *getter) GetUserByOrgIDAndID(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) (*types.User, error) {
	return module.store.GetByOrgIDAndID(ctx, orgID, userID)
}

func (module *getter) Get(ctx context.Context, id valuer.UUID) (*types.DeprecatedUser, error) {
	user, err := module.store.GetUser(ctx, id)
	if err != nil {
		return nil, err
	}

	userRoles, err := module.GetRolesByUserID(ctx, id)
	if err != nil {
		return nil, err
	}

	if len(userRoles) == 0 {
		return nil, errors.New(errors.TypeUnexpected, authtypes.ErrCodeUserRolesNotFound, "no user roles entries found")
	}

	if userRoles[0].Role == nil {
		return nil, errors.New(errors.TypeUnexpected, authtypes.ErrCodeRoleNotFound, "role not found for user role entry")
	}

	role := authtypes.SigNozManagedRoleToExistingLegacyRole[userRoles[0].Role.Name]

	return types.NewDeprecatedUserFromUserAndRole(user, role), nil
}

func (module *getter) ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	return module.store.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
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

// GetNonDeletedUserByEmailAndOrgID restricts that only one non-deleted user email can exist for an org ID, if found more, it throws an error.
func (module *getter) GetNonDeletedUserByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*types.User, error) {
	existingUsers, err := module.store.GetNonDeletedUsersByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		return nil, err
	}

	if len(existingUsers) > 1 {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "Multiple non-deleted users found for email %s in org_id: %s", email.StringValue(), orgID.StringValue())
	}

	if len(existingUsers) == 1 {
		return existingUsers[0], nil
	}

	return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "No non-deleted user found with email %s in org_id: %s", email.StringValue(), orgID.StringValue())

}

func (module *getter) GetRolesByUserID(ctx context.Context, userID valuer.UUID) ([]*authtypes.UserRole, error) {
	userRoles, err := module.userRoleStore.GetUserRolesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	for _, ur := range userRoles {
		if ur.Role == nil {
			return nil, errors.New(errors.TypeUnexpected, authtypes.ErrCodeRoleNotFound, "role not found for user role entry")
		}
	}

	return userRoles, nil
}

func (module *getter) GetResetPasswordTokenByOrgIDAndUserID(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) (*types.ResetPasswordToken, error) {
	return module.store.GetResetPasswordTokenByOrgIDAndUserID(ctx, orgID, userID)
}

func (module *getter) GetUsersByOrgIDAndRoleID(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) ([]*types.User, error) {
	return module.store.GetUsersByOrgIDAndRoleID(ctx, orgID, roleID)
}
