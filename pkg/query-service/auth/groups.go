package auth

import (
	"net/http"

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

func IsAuthorized(r *http.Request) error {
	// TODO: Add auth logic for the user accessing a particular endpoint.

	// route := mux.CurrentRoute(r)
	// path, _ := route.GetPathTemplate()
	// apiClass, ok := ApiClass[path]
	// if !ok {
	// 	return fmt.Errorf("Api class permission is not defined")
	// }
	// accessJwt := r.Header.Get("AccessToken")
	// if len(accessJwt) == 0 {
	// 	return fmt.Errorf("Access token is not found")
	// }

	// user, err := validateUser(accessJwt)
	// if err != nil {
	// 	return err
	// }

	return nil
}
