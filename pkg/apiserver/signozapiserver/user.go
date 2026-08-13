package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addUserRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/users", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.ListUsers, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/me", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.GetMyUserDeprecated), handler.OpenAPIDef{
		ID:                  "GetMyUserDeprecated",
		Tags:                []string{"users"},
		Summary:             "Get my user",
		Description:         "This endpoint is deprecated and always fails. Use GET /api/v2/users/me instead.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotImplemented},
		Deprecated:          true,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.GetMyUser), handler.OpenAPIDef{
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

	if err := router.Handle("/api/v2/users", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.CreateUser, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateUser",
			Tags:                []string{"users"},
			Summary:             "Create user",
			Description:         "This endpoint creates a user for the organization",
			Request:             new(authtypes.PostableUser),
			RequestContentType:  "application/json",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbCreate), coretypes.ResourceUser.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceUser,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceUser,
				SourceSelector: coretypes.WildcardSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      coretypes.BodyJSONArray("userRoles.#.id"),
				TargetSelector: provider.roleSelector,
				SkipIfNoIDs:    true,
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.UpdateMyUser), handler.OpenAPIDef{
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

	if err := router.Handle("/api/v2/users/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.GetUser, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.UpdateUser, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.DeleteUser, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/reset_password_tokens", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.GetResetPasswordToken, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceResetPasswordToken.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceResetPasswordToken,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/reset_password_tokens", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.CreateResetPasswordToken, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceResetPasswordToken.Scope(coretypes.VerbCreate), coretypes.ResourceUser.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceResetPasswordToken,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				ParentResource: coretypes.ResourceUser,
				ParentID:       coretypes.PathParam("id"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceResetPasswordToken,
				ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
			},
		),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/reset_password_tokens/verify", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.VerifyResetPasswordToken), handler.OpenAPIDef{
		ID:                  "VerifyResetPasswordToken",
		Tags:                []string{"users"},
		Summary:             "Verify a reset password token",
		Description:         "This endpoint verifies whether a reset password token exists and is not expired",
		Request:             new(types.PostableVerifyResetPasswordToken),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/me/factor_password", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.ChangePassword), handler.OpenAPIDef{
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
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/factor_password/forgot", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.ForgotPassword), handler.OpenAPIDef{
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

	if err := router.Handle("/api/v2/factor_password/reset", handler.New(provider.authzMiddleware.OpenAccess(provider.userHandler.ResetPassword), handler.OpenAPIDef{
		ID:                  "ResetPassword",
		Tags:                []string{"users"},
		Summary:             "Reset password",
		Description:         "This endpoint resets the password using a single use reset password token",
		Request:             new(types.PostableResetPassword),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/users/{id}/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.GetRolesByUserID, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/roles/{id}/users", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.GetUsersByRoleID, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/user_roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.CreateUserRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateUserRole",
			Tags:                []string{"users"},
			Summary:             "Create user role",
			Description:         "This endpoint assigns a role to a user",
			Request:             new(authtypes.PostableUserRole),
			RequestContentType:  "",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbAttach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceUser,
			SourceIDs:      coretypes.OneID(coretypes.BodyJSONPath("userId")),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(coretypes.BodyJSONPath("roleId")),
			TargetSelector: provider.roleSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/user_roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.GetUserRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetUserRole",
			Tags:                []string{"users"},
			Summary:             "Get user role",
			Description:         "This endpoint gets an existing user role",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(authtypes.UserRole),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceUser,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       provider.userRoleUserIDExtractor(),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/user_roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.userHandler.DeleteUserRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteUserRole",
			Tags:                []string{"users"},
			Summary:             "Delete user role",
			Description:         "This endpoint revokes a role from a user",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceUser.Scope(coretypes.VerbDetach), coretypes.ResourceRole.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbDetach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceUser,
			SourceIDs:      coretypes.OneID(provider.userRoleUserIDExtractor()),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(provider.userRoleRoleIDExtractor()),
			TargetSelector: provider.roleSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) userRoleUserIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		userRoleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return "", err
		}

		userRole, err := provider.userGetter.GetUserRoleByOrgIDAndID(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), userRoleID)
		if err != nil {
			return "", err
		}

		return userRole.UserID.String(), nil
	})
}

func (provider *provider) userRoleRoleIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		userRoleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return "", err
		}

		userRole, err := provider.userGetter.GetUserRoleByOrgIDAndID(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), userRoleID)
		if err != nil {
			return "", err
		}

		return userRole.RoleID.String(), nil
	})
}
