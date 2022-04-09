package auth

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/model"
)

type Permission int32

const (
	ReadPermission = iota
	WritePermission

	AuthDashboardAPIs = "DASHBOARD_APIS"
	AuthChannelAPIs   = "CHANNEL_APIS"
)

type Group struct {
	GroupID   string
	GroupName string
	Users     []*model.GroupUser
	Rules     []*model.RBACRule
}

var ApiClass = map[string]string{
	// Dashboard APIs
	"/api/v1/dashboards":        AuthDashboardAPIs,
	"/api/v1/dashboards/{uuid}": AuthDashboardAPIs,

	// Channel APIs
	"/api/v1/channels":      AuthChannelAPIs,
	"/api/v1/channels/{id}": AuthChannelAPIs,
}

type AuthCache struct {
	sync.RWMutex

	// A map from groupId -> Set of Rules (Set abstracted by map[key]->struct{})
	GroupRules map[string]map[string]struct{}

	UserGroups map[string]map[string]struct{}
	Rules      map[string]*model.RBACRule
}

var AuthCacheObj AuthCache

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
