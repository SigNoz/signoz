package auth

import (
	"context"
	"net/http"
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

// ApiClass is used to classify various APIs of similar type into a class so that auth rules
// can be applied on the whole API class.
var ApiClass = map[string]string{
	// Admin APIs
	"/api/v1/invite":                     constants.AdminAPI,
	"/api/v1/user":                       constants.AdminAPI,
	"/api/v1/rbac/role/{id}":             constants.AdminAPI,
	"/api/v1/org":                        constants.AdminAPI,
	"/api/v1/org/{id}":                   constants.AdminAPI,
	"/api/v1/getResetPasswordToken/{id}": constants.AdminAPI,

	"/api/v1/user/{id}":           constants.SelfAccessibleAPI,
	"/api/v1/changePassword/{id}": constants.SelfAccessibleAPI,

	"/api/v1/register":       constants.UnprotectedAPI,
	"/api/v1/login":          constants.UnprotectedAPI,
	"/api/v1/invite/{token}": constants.UnprotectedAPI,
}

type AuthCache struct {
	sync.RWMutex

	// A map from groupId -> Set of Rules (Set abstracted by map[key]->struct{})
	GroupRules map[string]map[string]struct{}

	UserGroups map[string]map[string]struct{}
	Rules      map[string]*model.RBACRule

	AdminGroupId  string
	EditorGroupId string
	ViewerGroupId string
}

var AuthCacheObj AuthCache

// InitAuthCache reads the DB and initialize the auth cache.
func InitAuthCache(ctx context.Context) error {

	AuthCacheObj.GroupRules = make(map[string]map[string]struct{})
	AuthCacheObj.UserGroups = make(map[string]map[string]struct{})
	AuthCacheObj.Rules = make(map[string]*model.RBACRule)

	rules, err := dao.DB().GetRules(ctx)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for rules")
	}
	for _, rule := range rules {
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

func (ac *AuthCache) AddGroupUser(gr *model.GroupUser) {
	ac.Lock()
	defer ac.Unlock()

	zap.S().Debugf("[AuthCache] Adding GroupUser %+v\n", gr)
	if _, ok := ac.UserGroups[gr.UserId]; !ok {
		ac.UserGroups[gr.UserId] = make(map[string]struct{})
	}
	ac.UserGroups[gr.UserId][gr.GroupId] = struct{}{}
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

	if _, ok := ac.UserGroups[gu.UserId]; !ok {
		ac.UserGroups[gu.UserId] = make(map[string]struct{})
	}
	delete(ac.UserGroups[gu.UserId], gu.GroupId)
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
	for g := range ac.UserGroups[user] {
		for ruleId := range ac.GroupRules[g] {
			if ac.Rules[ruleId].ApiClass == apiClass && ac.Rules[ruleId].Permission > permission {
				permission = ac.Rules[ruleId].Permission
			}
		}
	}
	return permission
}

func (ac *AuthCache) BelongsToAdminGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	for gid := range ac.UserGroups[userId] {
		if gid == ac.AdminGroupId {
			return true
		}
	}
	return false
}

func (ac *AuthCache) BelongsToEditorGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	for gid := range ac.UserGroups[userId] {
		if gid == ac.EditorGroupId {
			return true
		}
	}
	return false
}

func (ac *AuthCache) BelongsToViewerGroup(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	for gid := range ac.UserGroups[userId] {
		if gid == ac.ViewerGroupId {
			return true
		}
	}
	return false
}

// GetApiClass returns the API class for the given API path. Right now, all the non-admin APIs
// are classified as one class. This can be later extended to various classes as required.
func GetApiClass(apiPath string) string {
	apiClass, ok := ApiClass[apiPath]
	if !ok {
		return constants.NonAdminAPI
	}
	return apiClass
}

func IsAuthorized(r *http.Request) error {
	route := mux.CurrentRoute(r)
	path, _ := route.GetPathTemplate()
	apiClass := GetApiClass(path)
	if apiClass == constants.UnprotectedAPI {
		return nil
	}

	accessJwt, err := ExtractJwtFromRequest(r)
	if err != nil {
		return errors.Wrap(err, "Failed to extract access token")
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return err
	}

	// Guardian is permitted for all the APIs.
	if AuthCacheObj.BelongsToAdminGroup(user.Id) {
		return nil
	}

	if apiClass == constants.SelfAccessibleAPI && IsSelfAccessRequest(r) {
		zap.S().Debugf("Granting access for api: %v to user: %v because of self access",
			path, user.Email)
		return nil
	}

	perm := AuthCacheObj.HighestPermission(user.Id, apiClass)

	switch r.Method {
	case "GET":
		if perm >= constants.ReadPermission {
			return nil
		}
	case "POST", "PUT", "DELETE", "PATCH":
		if perm >= constants.WritePermission {
			return nil
		}
	}

	zap.S().Debugf("Received unauthorized request on api: %v, apiClass: %v by user: %v",
		path, apiClass, user.Email)
	return errors.New("Unauthorized, user doesn't have the required access")
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
	}
}
