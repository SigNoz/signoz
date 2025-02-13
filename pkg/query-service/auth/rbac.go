package auth

import (
	"context"
	"net/http"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
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
		*dest = group.Id
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

// TODO: remove this function altogether
func GetUserFromRequest(r *http.Request) (*model.UserPayload, error) {
	//get token and validate it
	jwt, err := authtypes.GetJwtFromRequest(r)
	if err != nil {
		return nil, err
	}

	claims, err := authtypes.GetJwtClaims(jwt, "")
	if err != nil {
		return nil, err
	}

	// validate the claims
	err = authtypes.ValidateJwtClaims(claims)
	if err != nil {
		return nil, err
	}

	user, err := claimsToUserPayload(claims)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func IsSelfAccessRequest(user *model.UserPayload, id string) bool { return user.Id == id }

func IsViewer(user *model.UserPayload) bool { return user.GroupId == AuthCacheObj.ViewerGroupId }
func IsEditor(user *model.UserPayload) bool { return user.GroupId == AuthCacheObj.EditorGroupId }
func IsAdmin(user *model.UserPayload) bool  { return user.GroupId == AuthCacheObj.AdminGroupId }

func ValidatePassword(password string) error {
	if len(password) < minimumPasswordLength {
		return errors.Errorf("Password should be atleast %d characters.", minimumPasswordLength)
	}
	return nil
}
