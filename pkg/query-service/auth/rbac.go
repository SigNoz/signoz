package auth

import (
	"context"
	"fmt"
	"net/http"
	"regexp"

	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
)

type Group struct {
	GroupID   string
	GroupName string
}

type Cache struct {
	AdminGroupId  string
	EditorGroupId string
	ViewerGroupId string
}

var CacheObj Cache

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

	if err := setGroupId(constants.AdminGroup, &CacheObj.AdminGroupId); err != nil {
		return err
	}
	if err := setGroupId(constants.EditorGroup, &CacheObj.EditorGroupId); err != nil {
		return err
	}
	if err := setGroupId(constants.ViewerGroup, &CacheObj.ViewerGroupId); err != nil {
		return err
	}

	return nil
}

func GetUserFromRequest(r *http.Request) (*model.UserPayload, error) {
	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		return nil, err
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func IsSelfAccessRequest(user *model.UserPayload, id string) bool { return user.Id == id }

func IsViewer(user *model.UserPayload) bool { return user.GroupId == CacheObj.ViewerGroupId }
func IsEditor(user *model.UserPayload) bool { return user.GroupId == CacheObj.EditorGroupId }
func IsAdmin(user *model.UserPayload) bool  { return user.GroupId == CacheObj.AdminGroupId }

func ValidatePassword(password string) error {
	if len(password) < minimumPasswordLength {
		return errors.Errorf("Password should be atleast %d characters.", minimumPasswordLength)
	}

	num := `[0-9]{1}`
	lower := `[a-z]{1}`
	upper := `[A-Z]{1}`
	symbol := `[!@#$&*]{1}`
	if b, err := regexp.MatchString(num, password); !b || err != nil {
		return fmt.Errorf("password should have atleast one number")
	}
	if b, err := regexp.MatchString(lower, password); !b || err != nil {
		return fmt.Errorf("password should have atleast one lower case letter")
	}
	if b, err := regexp.MatchString(upper, password); !b || err != nil {
		return fmt.Errorf("password should have atleast one upper case letter")
	}
	if b, err := regexp.MatchString(symbol, password); !b || err != nil {
		return fmt.Errorf("password should have atleast one special character from !@#$&* ")
	}
	return nil
}
