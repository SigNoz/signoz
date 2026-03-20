package impluser

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store         types.UserStore
	authz         authz.AuthZ
	userRoleStore authtypes.UserRoleStore
	flagger       flagger.Flagger
}

func NewGetter(store types.UserStore, authz authz.AuthZ, userRoleStore authtypes.UserRoleStore, flagger flagger.Flagger) user.Getter {
	return &getter{store: store, authz: authz, userRoleStore: userRoleStore, flagger: flagger}
}

func (module *getter) GetRootUserByOrgID(ctx context.Context, orgID valuer.UUID) (*types.User, error) {
	storableRootUser, err := module.store.GetRootUserByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	return types.NewUserFromStorableUser(storableRootUser), nil
}

func (module *getter) ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.DeprecatedUser, error) {
	storableUsers, err := module.store.ListUsersByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// filter root users if feature flag `hide_root_users` is true
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	hideRootUsers := module.flagger.BooleanOrEmpty(ctx, flagger.FeatureHideRootUser, evalCtx)

	if hideRootUsers {
		storableUsers = slices.DeleteFunc(storableUsers, func(user *types.StorableUser) bool { return user.IsRoot })
	}

	userIDs := make([]valuer.UUID, len(storableUsers))
	for idx, storableUser := range storableUsers {
		userIDs[idx] = storableUser.ID
	}

	storableUserRoles, err := module.userRoleStore.ListUserRolesByOrgIDAndUserIDs(ctx, orgID, userIDs)
	if err != nil {
		return nil, err
	}

	userIDToRoleIDs, roleIDs := authtypes.GetUserIDToRoleIDsMappingAndUniqueRoles(storableUserRoles)
	roles, err := module.authz.ListByOrgIDAndIDs(ctx, orgID, roleIDs)
	if err != nil {
		return nil, err
	}

	users := module.usersFromStorableUsersAndRolesMaps(storableUsers, roles, userIDToRoleIDs)

	return users, nil
}

// func (module *getter) GetUsersByEmail(ctx context.Context, email valuer.Email) ([]*types.User, error) {
// 	users, err := module.store.GetUsersByEmail(ctx, email)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return users, nil
// }

func (module *getter) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.DeprecatedUser, error) {
	storableUser, err := module.store.GetByOrgIDAndID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	// figure out role
	roleNames, err := module.resolveRoleNamesForUser(ctx, storableUser.ID, storableUser.OrgID)
	if err != nil {
		return nil, err
	}

	highestRole := authtypes.HighestLegacyRoleFromManagedRoleNames(roleNames)

	return types.NewDeprecatedUserFromStorableUserAndRole(storableUser, highestRole), nil
}

func (module *getter) Get(ctx context.Context, id valuer.UUID) (*types.DeprecatedUser, error) {
	storableUser, err := module.store.GetUser(ctx, id)
	if err != nil {
		return nil, err
	}

	// figure out role
	roleNames, err := module.resolveRoleNamesForUser(ctx, storableUser.ID, storableUser.OrgID)
	if err != nil {
		return nil, err
	}

	highestRole := authtypes.HighestLegacyRoleFromManagedRoleNames(roleNames)

	return types.NewDeprecatedUserFromStorableUserAndRole(storableUser, highestRole), nil
}

func (module *getter) ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	storableUsers, err := module.store.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
	if err != nil {
		return nil, err
	}

	users := make([]*types.User, len(storableUsers))
	for idx, sUser := range storableUsers {
		users[idx] = types.NewUserFromStorableUser(sUser)
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

func (module *getter) usersFromStorableUsersAndRolesMaps(storableUsers []*types.StorableUser, roles []*authtypes.Role, userIDToRoleIDsMap map[valuer.UUID][]valuer.UUID) []*types.DeprecatedUser {
	users := make([]*types.DeprecatedUser, 0, len(storableUsers))

	roleIDToRole := make(map[string]*authtypes.Role, len(roles))
	for _, role := range roles {
		roleIDToRole[role.ID.String()] = role
	}

	for _, user := range storableUsers {
		roleIDs := userIDToRoleIDsMap[user.ID]

		roleNames := make([]string, 0, len(roleIDs))
		for _, rid := range roleIDs {
			if role, ok := roleIDToRole[rid.String()]; ok {
				roleNames = append(roleNames, role.Name)
			}
		}

		highestRole := authtypes.HighestLegacyRoleFromManagedRoleNames(roleNames)

		deprecatedUser := types.NewDeprecatedUserFromStorableUserAndRole(user, highestRole)
		users = append(users, deprecatedUser)
	}

	return users
}

func (module *getter) resolveRoleNamesForUser(ctx context.Context, userID valuer.UUID, orgID valuer.UUID) ([]string, error) {
	storableUserRoles, err := module.userRoleStore.GetUserRolesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	roleIDs := make([]valuer.UUID, len(storableUserRoles))
	for idx, sur := range storableUserRoles {
		roleIDs[idx] = sur.RoleID
	}

	roles, err := module.authz.ListByOrgIDAndIDs(ctx, orgID, roleIDs)
	if err != nil {
		return nil, err
	}

	roleNames := make([]string, len(roles))
	for idx, role := range roles {
		roleNames[idx] = role.Name
	}

	return roleNames, nil
}
