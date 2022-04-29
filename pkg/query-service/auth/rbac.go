package auth

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"sync"

	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

type Permission int32

const ()

type Group struct {
	GroupID   string
	GroupName string
	Users     []*model.GroupUser
	Rules     []*model.RBACRule
}

type AuthCache struct {
	sync.RWMutex

	// A map from groupId -> Set of Rules (Set abstracted by map[key]->struct{})
	GroupRules map[string]map[string]struct{}

	UserGroup map[string]string
	Rules     map[string]*model.RBACRule

	AdminGroupId  string
	EditorGroupId string
	ViewerGroupId string
}

var AuthCacheObj AuthCache

// InitAuthCache reads the DB and initialize the auth cache.
func InitAuthCache(ctx context.Context) error {
	AuthCacheObj.GroupRules = make(map[string]map[string]struct{})
	AuthCacheObj.UserGroup = make(map[string]string)
	AuthCacheObj.Rules = make(map[string]*model.RBACRule)

	rules, err := dao.DB().GetRules(ctx)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for rules")
	}
	for _, rule := range rules {
		rule := rule
		AuthCacheObj.AddRule(&rule)
	}

	groups, err := dao.DB().GetGroups(ctx)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for groups")
	}
	for _, group := range groups {
		gr, err := dao.DB().GetGroupRules(ctx, group.Id)
		if err != nil {
			return errors.Wrap(err.Err, "Failed to query for group rules")
		}
		for _, r := range gr {
			AuthCacheObj.AddGroupRule(&r)
		}

		gu, err := dao.DB().GetGroupUsers(ctx, group.Id)
		if err != nil {
			return errors.Wrap(err.Err, "Failed to query for group users")
		}
		for _, u := range gu {
			AuthCacheObj.AddGroupUser(&u)
		}
	}

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

// Add user group updates the previous group if any as a user can only belong to a single group.
func (ac *AuthCache) AddGroupUser(gr *model.GroupUser) {
	ac.Lock()
	defer ac.Unlock()

	ac.UserGroup[gr.UserId] = gr.GroupId
}

func (ac *AuthCache) AddGroupRule(gr *model.GroupRule) {
	ac.Lock()
	defer ac.Unlock()

	if _, ok := ac.GroupRules[gr.GroupId]; !ok {
		ac.GroupRules[gr.GroupId] = make(map[string]struct{})
	}
	ac.GroupRules[gr.GroupId][gr.RuleId] = struct{}{}
}

func (ac *AuthCache) AddRule(r *model.RBACRule) {
	ac.Lock()
	defer ac.Unlock()

	ac.Rules[r.Id] = r
}

func (ac *AuthCache) RemoveGroupUser(gu *model.GroupUser) {
	ac.Lock()
	defer ac.Unlock()

	delete(ac.UserGroup, gu.UserId)
}

func (ac *AuthCache) RemoveGroupRule(gr *model.GroupRule) {
	ac.Lock()
	defer ac.Unlock()

	if _, ok := ac.GroupRules[gr.GroupId]; !ok {
		ac.GroupRules[gr.GroupId] = make(map[string]struct{})
	}
	delete(ac.GroupRules[gr.GroupId], gr.RuleId)
}

func (ac *AuthCache) RemoveRule(r *model.RBACRule) {
	ac.Lock()
	defer ac.Unlock()

	delete(ac.Rules, r.Id)
}

func (ac *AuthCache) HighestPermission(user, apiClass string) int {
	ac.RLock()
	defer ac.RUnlock()

	permission := -1
	userGroupId := ac.UserGroup[user]
	for ruleId := range ac.GroupRules[userGroupId] {
		if ac.Rules[ruleId].ApiClass == apiClass && ac.Rules[ruleId].Permission > permission {
			permission = ac.Rules[ruleId].Permission
		}
	}
	return permission
}

func (ac *AuthCache) BelongsToAdminGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	return ac.UserGroup[userId] == ac.AdminGroupId
}

func (ac *AuthCache) BelongsToEditorGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	return ac.UserGroup[userId] == ac.EditorGroupId
}

func (ac *AuthCache) BelongsToViewerGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	return ac.UserGroup[userId] == ac.ViewerGroupId
}

func IsValidAPIClass(class string) bool {
	for _, c := range ValidAPIClasses() {
		if class == c {
			return true
		}
	}
	return false
}

func ValidAPIClasses() []string {
	return []string{
		constants.AdminAPI,
		constants.NonAdminAPI,
		constants.SelfAccessibleAPI,
		constants.UnprotectedAPI,
	}
}

func IsAdmin(r *http.Request) bool {
	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		zap.S().Debugf("Failed to verify admin access, err: %v", err)
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return false
	}
	return AuthCacheObj.BelongsToAdminGroup(user.Id)
}

func IsSelfAccessRequest(r *http.Request) bool {
	id := mux.Vars(r)["id"]
	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		zap.S().Debugf("Failed to verify self access, err: %v", err)
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		zap.S().Debugf("Failed to verify self access, err: %v", err)
		return false
	}
	zap.S().Debugf("Self access verification, userID: %s, id: %s\n", user.Id, id)
	return user.Id == id
}

func IsViewer(r *http.Request) bool {
	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		zap.S().Debugf("Failed to verify viewer access, err: %v", err)
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return false
	}

	return AuthCacheObj.BelongsToViewerGroup(user.Id)
}

func IsEditor(r *http.Request) bool {
	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		zap.S().Debugf("Failed to verify editor access, err: %v", err)
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return false
	}
	return AuthCacheObj.BelongsToEditorGroup(user.Id)
}

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
