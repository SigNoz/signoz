package signozapiserver

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/gorilla/mux"
)

type provider struct {
	config            apiserver.Config
	settings          factory.ScopedProviderSettings
	router            *mux.Router
	authZ             *middleware.AuthZ
	orgHandler        organization.Handler
	userHandler       user.Handler
	sessionHandler    session.Handler
	authDomainHandler authdomain.Handler
	preferenceHandler preference.Handler
}

func NewFactory(
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
	userHandler user.Handler,
	sessionHandler session.Handler,
	authDomainHandler authdomain.Handler,
	preferenceHandler preference.Handler,
) factory.ProviderFactory[apiserver.APIServer, apiserver.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config apiserver.Config) (apiserver.APIServer, error) {
		return newProvider(ctx, providerSettings, config, orgGetter, authz, orgHandler, userHandler, sessionHandler, authDomainHandler, preferenceHandler)
	})
}

func newProvider(
	_ context.Context,
	providerSettings factory.ProviderSettings,
	config apiserver.Config,
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
	userHandler user.Handler,
	sessionHandler session.Handler,
	authDomainHandler authdomain.Handler,
	preferenceHandler preference.Handler,
) (apiserver.APIServer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/apiserver/signozapiserver")
	router := mux.NewRouter().UseEncodedPath()

	provider := &provider{
		config:            config,
		settings:          settings,
		router:            router,
		orgHandler:        orgHandler,
		userHandler:       userHandler,
		sessionHandler:    sessionHandler,
		authDomainHandler: authDomainHandler,
		preferenceHandler: preferenceHandler,
	}

	provider.authZ = middleware.NewAuthZ(settings.Logger(), orgGetter, authz)

	provider.AddToRouter(router)
	return provider, nil
}

func (provider *provider) Router() *mux.Router {
	return provider.router
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authZ.AdminAccess(provider.orgHandler.Get), handler.OpenAPIDef{
		ID:                  "GetMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Get my organization",
		Description:         "This endpoint returns the organization I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.Organization{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authZ.AdminAccess(provider.orgHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Update my organization",
		Description:         "This endpoint updates the organization I belong to",
		Request:             &types.Organization{},
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusConflict, http.StatusBadRequest},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/login", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.DeprecatedCreateSessionByEmailPassword), handler.OpenAPIDef{
		ID:                  "DeprecatedCreateSessionByEmailPassword",
		Tags:                []string{"sessions"},
		Summary:             "Deprecated create session by email password",
		Description:         "This endpoint is deprecated and will be removed in the future",
		Request:             &authtypes.DeprecatedPostableLogin{},
		RequestContentType:  "application/json",
		Response:            &authtypes.DeprecatedGettableLogin{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          true,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions/email_password", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByEmailPassword), handler.OpenAPIDef{
		ID:                  "CreateSessionByEmailPassword",
		Tags:                []string{"sessions"},
		Summary:             "Create session by email password",
		Description:         "This endpoint creates a session for a user using email and password",
		Request:             &authtypes.PostableEmailPasswordSession{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions/context", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.GetSessionContext), handler.OpenAPIDef{
		ID:                  "GetSessionContext",
		Tags:                []string{"sessions"},
		Summary:             "Get session context",
		Description:         "This endpoint returns the context for the session",
		Request:             nil,
		RequestContentType:  "",
		Response:            &authtypes.SessionContext{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions/rotate", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.RotateSession), handler.OpenAPIDef{
		ID:                  "RotateSession",
		Tags:                []string{"sessions"},
		Summary:             "Rotate session",
		Description:         "This endpoint rotates the session",
		Request:             &authtypes.PostableRotateToken{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.DeleteSession), handler.OpenAPIDef{
		ID:                  "DeleteSession",
		Tags:                []string{"sessions"},
		Summary:             "Delete session",
		Description:         "This endpoint deletes the session",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/google", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByGoogleCallback), handler.OpenAPIDef{
		ID:                  "CreateSessionByGoogleCallback",
		Tags:                []string{"sessions"},
		Summary:             "Create session by google callback",
		Description:         "This endpoint creates a session for a user using google callback",
		Request:             nil,
		RequestContentType:  "",
		Response:            &authtypes.GettableToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/saml", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionBySAMLCallback), handler.OpenAPIDef{
		ID:          "CreateSessionBySAMLCallback",
		Tags:        []string{"sessions"},
		Summary:     "Create session by saml callback",
		Description: "This endpoint creates a session for a user using saml callback",
		Request: struct {
			RelayState   string `from:"RelayState"`
			SAMLResponse string `from:"SAMLResponse"`
		}{},
		RequestContentType:  "application/x-www-form-urlencoded",
		Response:            &authtypes.GettableToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/oidc", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByOIDCCallback), handler.OpenAPIDef{
		ID:                  "CreateSessionByOIDCCallback",
		Tags:                []string{"sessions"},
		Summary:             "Create session by oidc callback",
		Description:         "This endpoint creates a session for a user using oidc callback",
		Request:             nil,
		RequestContentType:  "",
		Response:            &authtypes.GettableToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.List), handler.OpenAPIDef{
		ID:                  "ListAuthDomains",
		Tags:                []string{"auth domains"},
		Summary:             "List auth domains",
		Description:         "This endpoint lists all auth domains",
		Request:             nil,
		RequestContentType:  "",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Create auth domain",
		Description:         "This endpoint creates an auth domain",
		Request:             &authtypes.PostableAuthDomain{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Update auth domain",
		Description:         "This endpoint updates an auth domain",
		Request:             &authtypes.UpdateableAuthDomain{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Delete auth domain",
		Description:         "This endpoint deletes an auth domain",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateInvite), handler.OpenAPIDef{
		ID:                  "CreateInvite",
		Tags:                []string{"invites"},
		Summary:             "Create invite",
		Description:         "This endpoint creates an invite for a user",
		Request:             &types.PostableInvite{},
		RequestContentType:  "application/json",
		Response:            &types.Invite{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite/bulk", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateBulkInvite), handler.OpenAPIDef{
		ID:                 "CreateBulkInvite",
		Tags:               []string{"invites"},
		Summary:            "Create bulk invite",
		Description:        "This endpoint creates a bulk invite for a user",
		Request:            []*types.PostableInvite{},
		RequestContentType: "application/json",
		Response:           nil,
		SuccessStatusCode:  http.StatusCreated,
		ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:         false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite/{token}", handler.New(provider.authZ.OpenAccess(provider.userHandler.GetInvite), handler.OpenAPIDef{
		ID:                  "GetInvite",
		Tags:                []string{"invites"},
		Summary:             "Get invite",
		Description:         "This endpoint gets an invite by token",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.Invite{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.DeleteInvite), handler.OpenAPIDef{
		ID:                  "DeleteInvite",
		Tags:                []string{"invites"},
		Summary:             "Delete invite",
		Description:         "This endpoint deletes an invite by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite", handler.New(provider.authZ.AdminAccess(provider.userHandler.ListInvite), handler.OpenAPIDef{
		ID:                  "ListInvite",
		Tags:                []string{"invites"},
		Summary:             "List invites",
		Description:         "This endpoint lists all invites",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.Invite{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite/accept", handler.New(provider.authZ.OpenAccess(provider.userHandler.AcceptInvite), handler.OpenAPIDef{
		ID:                  "AcceptInvite",
		Tags:                []string{"invites"},
		Summary:             "Accept invite",
		Description:         "This endpoint accepts an invite by token",
		Request:             &types.PostableAcceptInvite{},
		RequestContentType:  "application/json",
		Response:            &types.User{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/pats", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateAPIKey), handler.OpenAPIDef{
		ID:                  "CreateAPIKey",
		Tags:                []string{"api keys"},
		Summary:             "Create api key",
		Description:         "This endpoint creates an api key",
		Request:             &types.PostableAPIKey{},
		RequestContentType:  "application/json",
		Response:            &types.GettableAPIKey{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/pats", handler.New(provider.authZ.AdminAccess(provider.userHandler.ListAPIKeys), handler.OpenAPIDef{
		ID:                  "ListAPIKeys",
		Tags:                []string{"api keys"},
		Summary:             "List api keys",
		Description:         "This endpoint lists all api keys",
		Request:             nil,
		RequestContentType:  "",
		Response:            []*types.GettableAPIKey{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/pats/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.UpdateAPIKey), handler.OpenAPIDef{
		ID:                  "UpdateAPIKey",
		Tags:                []string{"api keys"},
		Summary:             "Update api key",
		Description:         "This endpoint updates an api key",
		Request:             &types.PostableAPIKey{},
		RequestContentType:  "application/json",
		Response:            &types.GettableAPIKey{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/pats/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.RevokeAPIKey), handler.OpenAPIDef{
		ID:                  "RevokeAPIKey",
		Tags:                []string{"api keys"},
		Summary:             "Revoke api key",
		Description:         "This endpoint revokes an api key",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user", handler.New(provider.authZ.AdminAccess(provider.userHandler.ListUsers), handler.OpenAPIDef{
		ID:                  "ListUsers",
		Tags:                []string{"users"},
		Summary:             "List users",
		Description:         "This endpoint lists all users",
		Request:             nil,
		RequestContentType:  "",
		Response:            []*types.GettableUser{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/me", handler.New(provider.authZ.OpenAccess(provider.userHandler.GetMyUser), handler.OpenAPIDef{
		ID:                  "GetMyUser",
		Tags:                []string{"users"},
		Summary:             "Get my user",
		Description:         "This endpoint returns the user I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.GettableUser{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/{id}", handler.New(provider.authZ.SelfAccess(provider.userHandler.GetUser), handler.OpenAPIDef{
		ID:                  "GetUser",
		Tags:                []string{"users"},
		Summary:             "Get user",
		Description:         "This endpoint returns the user by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.GettableUser{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/{id}", handler.New(provider.authZ.SelfAccess(provider.userHandler.UpdateUser), handler.OpenAPIDef{
		Summary:             "Update user",
		Description:         "This endpoint updates the user by id",
		Request:             &types.User{},
		RequestContentType:  "application/json",
		Response:            &types.GettableUser{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.DeleteUser), handler.OpenAPIDef{
		ID:                  "DeleteUser",
		Tags:                []string{"users"},
		Summary:             "Delete user",
		Description:         "This endpoint deletes the user by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/getResetPasswordToken/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetResetPasswordToken), handler.OpenAPIDef{
		ID:                  "GetResetPasswordToken",
		Tags:                []string{"users"},
		Summary:             "Get reset password token",
		Description:         "This endpoint returns the reset password token by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            &types.ResetPasswordToken{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/resetPassword", handler.New(provider.authZ.OpenAccess(provider.userHandler.ResetPassword), handler.OpenAPIDef{
		ID:                  "ResetPassword",
		Tags:                []string{"users"},
		Summary:             "Reset password",
		Description:         "This endpoint resets the password by token",
		Request:             &types.PostableResetPassword{},
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/changePassword/{id}", handler.New(provider.authZ.SelfAccess(provider.userHandler.ChangePassword), handler.OpenAPIDef{
		ID:                  "ChangePassword",
		Tags:                []string{"users"},
		Summary:             "Change password",
		Description:         "This endpoint changes the password by id",
		Request:             &types.ChangePasswordRequest{},
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/preferences", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.ListByUser), handler.OpenAPIDef{
		ID:                  "ListUserPreferences",
		Tags:                []string{"preferences"},
		Summary:             "List user preferences",
		Description:         "This endpoint lists all user preferences",
		Request:             nil,
		RequestContentType:  "",
		Response:            []*preferencetypes.Preference{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/preferences/{name}", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.GetByUser), handler.OpenAPIDef{
		ID:                  "GetUserPreference",
		Tags:                []string{"preferences"},
		Summary:             "Get user preference",
		Description:         "This endpoint returns the user preference by name",
		Request:             nil,
		RequestContentType:  "",
		Response:            &preferencetypes.Preference{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/preferences/{name}", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.UpdateByUser), handler.OpenAPIDef{
		ID:                  "UpdateUserPreference",
		Tags:                []string{"preferences"},
		Summary:             "Update user preference",
		Description:         "This endpoint updates the user preference by name",
		Request:             &preferencetypes.UpdatablePreference{},
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.ListByOrg), handler.OpenAPIDef{
		ID:                  "ListOrgPreferences",
		Tags:                []string{"preferences"},
		Summary:             "List org preferences",
		Description:         "This endpoint lists all org preferences",
		Request:             nil,
		RequestContentType:  "",
		Response:            []*preferencetypes.Preference{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences/{name}", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.GetByOrg), handler.OpenAPIDef{
		ID:                  "GetOrgPreference",
		Tags:                []string{"preferences"},
		Summary:             "Get org preference",
		Description:         "This endpoint returns the org preference by name",
		Request:             nil,
		RequestContentType:  "",
		Response:            &preferencetypes.Preference{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences/{name}", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.UpdateByOrg), handler.OpenAPIDef{
		ID:                  "UpdateOrgPreference",
		Tags:                []string{"preferences"},
		Summary:             "Update org preference",
		Description:         "This endpoint updates the org preference by name",
		Request:             &preferencetypes.UpdatablePreference{},
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}
