package auth

import (
	"context"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/types"
	"go.signoz.io/signoz/pkg/types/authtypes"
)

type Group struct {
	GroupID   string
	GroupName string
}

type AuthCache struct {
	AdminGroupId  string
	EditorGroupId string
	ViewerGroupId string
}

var AuthCacheObj AuthCache

// InitAuthCache reads the DB and initialize the auth cache.
func InitAuthCache(ctx context.Context) error {

	setGroupId := func(groupName string, dest *string) error {
		group, err := dao.DB().GetGroupByName(ctx, groupName)
		if err != nil {
			return errors.Wrapf(err.Err, "failed to get group %s", groupName)
		}
		*dest = group.ID
		return nil
	}

	if err := setGroupId(constants.AdminGroup, &AuthCacheObj.AdminGroupId); err != nil {
		return err
	}
	if err := setGroupId(constants.EditorGroup, &AuthCacheObj.EditorGroupId); err != nil {
		return err
	}
	if err := setGroupId(constants.ViewerGroup, &AuthCacheObj.ViewerGroupId); err != nil {
		return err
	}

	return nil
}

func GetUserFromReqContext(ctx context.Context) (*types.GettableUser, error) {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, errors.New("no claims found in context")
	}

	user := &types.GettableUser{
		User: types.User{
			ID:      claims.UserID,
			GroupID: claims.GroupID,
			Email:   claims.Email,
			OrgID:   claims.OrgID,
		},
	}
	return user, nil
}

func IsSelfAccessRequest(user *types.GettableUser, id string) bool { return user.ID == id }

func IsViewer(user *types.GettableUser) bool { return user.GroupID == AuthCacheObj.ViewerGroupId }
func IsEditor(user *types.GettableUser) bool { return user.GroupID == AuthCacheObj.EditorGroupId }
func IsAdmin(user *types.GettableUser) bool  { return user.GroupID == AuthCacheObj.AdminGroupId }

func ValidatePassword(password string) error {
	if len(password) < minimumPasswordLength {
		return errors.Errorf("Password should be atleast %d characters.", minimumPasswordLength)
	}
	return nil
}
