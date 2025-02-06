package app

import (
	"context"
	"errors"
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type AuthMiddleware struct {
	GetUserFromRequest func(r *http.Request) (*model.UserPayload, error)
}

func NewAuthMiddleware(f func(r *http.Request) (*model.UserPayload, error)) *AuthMiddleware {
	return &AuthMiddleware{
		GetUserFromRequest: f,
	}
}

func (am *AuthMiddleware) OpenAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		f(w, r)
	}
}

func (am *AuthMiddleware) ViewAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := am.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}

		if !(auth.IsViewer(user) || auth.IsEditor(user) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to viewers/editors/admins"),
			}, nil)
			return
		}
		ctx := context.WithValue(r.Context(), constants.ContextUserKey, user)
		ctx = context.WithValue(ctx, constants.ContextTenantKey, user.Organization)
		r = r.WithContext(ctx)
		f(w, r)
	}
}

func (am *AuthMiddleware) EditAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := am.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		if !(auth.IsEditor(user) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to editors/admins"),
			}, nil)
			return
		}
		ctx := context.WithValue(r.Context(), constants.ContextUserKey, user)
		ctx = context.WithValue(ctx, constants.ContextTenantKey, user.Organization)
		r = r.WithContext(ctx)
		f(w, r)
	}
}

func (am *AuthMiddleware) SelfAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := am.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		id := mux.Vars(r)["id"]
		if !(auth.IsSelfAccessRequest(user, id) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible for self access or to the admins"),
			}, nil)
			return
		}
		ctx := context.WithValue(r.Context(), constants.ContextUserKey, user)
		ctx = context.WithValue(ctx, constants.ContextTenantKey, user.Organization)
		r = r.WithContext(ctx)
		f(w, r)
	}
}

func (am *AuthMiddleware) AdminAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := am.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		if !auth.IsAdmin(user) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to admins only"),
			}, nil)
			return
		}
		ctx := context.WithValue(r.Context(), constants.ContextUserKey, user)
		ctx = context.WithValue(ctx, constants.ContextTenantKey, user.Organization)
		r = r.WithContext(ctx)
		f(w, r)
	}
}
