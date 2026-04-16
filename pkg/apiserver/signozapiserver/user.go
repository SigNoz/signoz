package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addUserRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/invite", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateInvite), handler.OpenAPIDef{
		ID:                  "CreateInvite",
		Tags:                []string{"users"},
		Summary:             "Create invite",
		Description:         "This endpoint creates an invite for a user",
		Request:             new(types.PostableInvite),
		RequestContentType:  "application/json",
		Response:            new(types.Invite),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/invite/bulk", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateBulkInvite), handler.OpenAPIDef{
		ID:                 "CreateBulkInvite",
		Tags:               []string{"users"},
		Summary:            "Create bulk invite",
		Description:        "This endpoint creates a bulk invite for a user",
		Request:            new(types.PostableBulkInviteRequest),
		RequestContentType: "application/json",
		Response:           nil,
		SuccessStatusCode:  http.StatusCreated,
		ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:         false,
		SecuritySchemes:    newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user", handler.New(provider.authZ.AdminAccess(provider.userHandler.ListUsersDeprecated), handler.OpenAPIDef{
		ID:                  "ListUsersDeprecated",
		Tags:                []string{"users"},
		Summary:             "List users",
		Description:         "This endpoint lists all users",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*types.DeprecatedUser, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users", handler.New(provider.authZ.AdminAccess(provider.userHandler.ListUsers), handler.OpenAPIDef{
		ID:                  "ListUsers",
		Tags:                []string{"users"},
		Summary:             "List users v2",
		Description:         "This endpoint lists all users for the organization",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*types.User, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/me", handler.New(provider.authZ.OpenAccess(provider.userHandler.GetMyUserDeprecated), handler.OpenAPIDef{
		ID:                  "GetMyUserDeprecated",
		Tags:                []string{"users"},
		Summary:             "Get my user",
		Description:         "This endpoint returns the user I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.DeprecatedUser),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me", handler.New(provider.authZ.OpenAccess(provider.userHandler.GetMyUser), handler.OpenAPIDef{
		ID:                  "GetMyUser",
		Tags:                []string{"users"},
		Summary:             "Get my user v2",
		Description:         "This endpoint returns the user I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.UserWithRoles),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me", handler.New(provider.authZ.OpenAccess(provider.userHandler.UpdateMyUser), handler.OpenAPIDef{
		ID:                  "UpdateMyUserV2",
		Tags:                []string{"users"},
		Summary:             "Update my user v2",
		Description:         "This endpoint updates the user I belong to",
		Request:             new(types.UpdatableUser),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/{id}", handler.New(provider.authZ.SelfAccess(provider.userHandler.GetUserDeprecated), handler.OpenAPIDef{
		ID:                  "GetUserDeprecated",
		Tags:                []string{"users"},
		Summary:             "Get user",
		Description:         "This endpoint returns the user by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.DeprecatedUser),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetUser), handler.OpenAPIDef{
		ID:                  "GetUser",
		Tags:                []string{"users"},
		Summary:             "Get user by user id",
		Description:         "This endpoint returns the user by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.UserWithRoles),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/{id}", handler.New(provider.authZ.SelfAccess(provider.userHandler.UpdateUserDeprecated), handler.OpenAPIDef{
		ID:                  "UpdateUserDeprecated",
		Tags:                []string{"users"},
		Summary:             "Update user",
		Description:         "This endpoint updates the user by id",
		Request:             new(types.DeprecatedUser),
		RequestContentType:  "application/json",
		Response:            new(types.DeprecatedUser),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.UpdateUser), handler.OpenAPIDef{
		ID:                  "UpdateUser",
		Tags:                []string{"users"},
		Summary:             "Update user v2",
		Description:         "This endpoint updates the user by id",
		Request:             new(types.UpdatableUser),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
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
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/getResetPasswordToken/{id}", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetResetPasswordTokenDeprecated), handler.OpenAPIDef{
		ID:                  "GetResetPasswordTokenDeprecated",
		Tags:                []string{"users"},
		Summary:             "Get reset password token",
		Description:         "This endpoint returns the reset password token by id",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.ResetPasswordToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          true,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/reset_password_tokens", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetResetPasswordToken), handler.OpenAPIDef{
		ID:                  "GetResetPasswordToken",
		Tags:                []string{"users"},
		Summary:             "Get reset password token for a user",
		Description:         "This endpoint returns the existing reset password token for a user.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.ResetPasswordToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/reset_password_tokens", handler.New(provider.authZ.AdminAccess(provider.userHandler.CreateResetPasswordToken), handler.OpenAPIDef{
		ID:                  "CreateResetPasswordToken",
		Tags:                []string{"users"},
		Summary:             "Create or regenerate reset password token for a user",
		Description:         "This endpoint creates or regenerates a reset password token for a user. If a valid token exists, it is returned. If expired, a new one is created.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.ResetPasswordToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/resetPassword", handler.New(provider.authZ.OpenAccess(provider.userHandler.ResetPassword), handler.OpenAPIDef{
		ID:                  "ResetPassword",
		Tags:                []string{"users"},
		Summary:             "Reset password",
		Description:         "This endpoint resets the password by token",
		Request:             new(types.PostableResetPassword),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me/factor_password", handler.New(provider.authZ.OpenAccess(provider.userHandler.ChangePassword), handler.OpenAPIDef{
		ID:                  "UpdateMyPassword",
		Tags:                []string{"users"},
		Summary:             "Updates my password",
		Description:         "This endpoint updates the password of the user I belong to",
		Request:             new(types.ChangePasswordRequest),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/factor_password/forgot", handler.New(provider.authZ.OpenAccess(provider.userHandler.ForgotPassword), handler.OpenAPIDef{
		ID:                  "ForgotPassword",
		Tags:                []string{"users"},
		Summary:             "Forgot password",
		Description:         "This endpoint initiates the forgot password flow by sending a reset password email",
		Request:             new(types.PostableForgotPassword),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnprocessableEntity},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/roles", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetRolesByUserID), handler.OpenAPIDef{
		ID:                  "GetRolesByUserID",
		Tags:                []string{"users"},
		Summary:             "Get user roles",
		Description:         "This endpoint returns the user roles by user id",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*authtypes.Role, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/roles", handler.New(provider.authZ.AdminAccess(provider.userHandler.SetRoleByUserID), handler.OpenAPIDef{
		ID:                  "SetRoleByUserID",
		Tags:                []string{"users"},
		Summary:             "Set user roles",
		Description:         "This endpoint assigns the role to the user roles by user id",
		Request:             new(types.PostableRole),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/roles/{roleId}", handler.New(provider.authZ.AdminAccess(provider.userHandler.RemoveUserRoleByRoleID), handler.OpenAPIDef{
		ID:                  "RemoveUserRoleByUserIDAndRoleID",
		Tags:                []string{"users"},
		Summary:             "Remove a role from user",
		Description:         "This endpoint removes a role from the user by user id and role id",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/roles/{id}/users", handler.New(provider.authZ.AdminAccess(provider.userHandler.GetUsersByRoleID), handler.OpenAPIDef{
		ID:                  "GetUsersByRoleID",
		Tags:                []string{"users"},
		Summary:             "Get users by role id",
		Description:         "This endpoint returns the users having the role by role id",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*types.User, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
