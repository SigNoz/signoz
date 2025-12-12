package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addUserRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/invite", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateInvite), handler.OpenAPIDef{
		ID:                  "CreateInvite",
		Tags:                []string{"invites"},
		Summary:             "Create invite",
		Description:         "This endpoint creates an invite for a user",
		Request:             &types.PostableInvite{},
		RequestContentType:  "application/json",
		Response:            &types.Invite{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: ctxtypes.AuthTypeAPIKey.StringValue()}, {Name: ctxtypes.AuthTypeTokenizer.StringValue()}},
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

	return nil
}
