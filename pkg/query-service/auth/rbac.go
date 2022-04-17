package auth

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
)

type Permission int32

const (
	ReadPermission = iota
	WritePermission

	DashboardAPIs = "DASHBOARD_APIS"
	ChannelAPIs   = "CHANNEL_APIS"
	AuthAPIs      = "AUTH_APIS"

	ROLE_VIEWER = "ROLE_VIEWER"
	ROLE_EDITOR = "ROLE_EDITOR"
	ROLE_ADMIN  = "ROLE_ADMIN"
)

type Group struct {
	GroupID   string
	GroupName string
	Users     []*model.GroupUser
	Rules     []*model.RBACRule
}

var ApiClass = map[string]string{
	// Dashboard APIs
	"/api/v1/dashboards":        DashboardAPIs,
	"/api/v1/dashboards/{uuid}": DashboardAPIs,

	// Channel APIs
	"/api/v1/channels":      ChannelAPIs,
	"/api/v1/channels/{id}": ChannelAPIs,

	// Auth APIs
	"/api/v1/invite":              AuthAPIs,
	"/api/v1/user":                AuthAPIs,
	"/api/v1/rbac/group":          AuthAPIs,
	"/api/v1/rbac/group/{id}":     AuthAPIs,
	"/api/v1/rbac/rule":           AuthAPIs,
	"/api/v1/rbac/rule/{id}":      AuthAPIs,
	"/api/v1/rbac/groupRule":      AuthAPIs,
	"/api/v1/rbac/groupRule/{id}": AuthAPIs,
	"/api/v1/rbac/groupUser":      AuthAPIs,
	"/api/v1/rbac/groupUser/{id}": AuthAPIs,
}

type AuthCache struct {
	sync.RWMutex

	// A map from groupId -> Set of Rules (Set abstracted by map[key]->struct{})
	GroupRules map[string]map[string]struct{}

	UserGroups map[string]map[string]struct{}
	Rules      map[string]*model.RBACRule

	GuardianGroupId string
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

	guardian, err := dao.DB().GetGroupByName(ctx, constants.RootGroup)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to get guardian group")
	}
	AuthCacheObj.GuardianGroupId = guardian.Id

	return nil
}

func (ac *AuthCache) AddGroupUser(gr *model.GroupUser) {
	ac.Lock()
	defer ac.Unlock()

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

func (ac *AuthCache) IsGuardian(userId string) bool {
	ac.RLock()
	defer ac.RUnlock()

	for gid := range ac.UserGroups[userId] {
		if gid == ac.GuardianGroupId {
			return true
		}
	}
	return false
}

func IsAuthorized(r *http.Request) error {
	route := mux.CurrentRoute(r)
	path, _ := route.GetPathTemplate()
	apiClass, ok := ApiClass[path]
	if !ok {
		// It's an unprotected API currently, allow the requests
		return nil
	}
	accessJwt := r.Header.Get("AccessToken")
	if len(accessJwt) == 0 {
		return fmt.Errorf("Access token is not found")
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return err
	}

	// Guardian is permitted for all the APIs.
	if AuthCacheObj.IsGuardian(user.Id) {
		return nil
	}

	perm := AuthCacheObj.HighestPermission(user.Id, apiClass)

	switch r.Method {
	case "GET":
		if perm >= ReadPermission {
			return nil
		}
	case "POST", "PUT", "DELETE":
		if perm >= WritePermission {
			return nil
		}
	default:
		return errors.New("Unauthorized, user doesn't have required access")
	}

	return nil
}

func IsGuardian(r *http.Request) bool {
	accessJwt := r.Header.Get("AccessToken")
	if len(accessJwt) == 0 {
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return false
	}
	return AuthCacheObj.IsGuardian(user.Id)
}

func IsSelfAccess(r *http.Request, id string) bool {
	accessJwt := r.Header.Get("AccessToken")
	if len(accessJwt) == 0 {
		return false
	}

	user, err := validateUser(accessJwt)
	if err != nil {
		return false
	}
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
		AuthAPIs,
		DashboardAPIs,
		ChannelAPIs,
	}
}
