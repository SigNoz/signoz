package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

const (
	authzDeniedMessage string = "::AUTHZ-DENIED::"
)

type AuthZ struct {
	logger       *slog.Logger
	authzService authz.AuthZ
}

func NewAuthZ(logger *slog.Logger) *AuthZ {
	if logger == nil {
		panic("cannot build authz middleware, logger is empty")
	}

	return &AuthZ{logger: logger}
}

func (middleware *AuthZ) ViewAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		if err := claims.IsViewer(); err != nil {
			middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) EditAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		if err := claims.IsEditor(); err != nil {
			middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) AdminAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		if err := claims.IsAdmin(); err != nil {
			middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) SelfAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		id := mux.Vars(req)["id"]
		if err := claims.IsSelfAccess(id); err != nil {
			middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) OpenAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		next(rw, req)
	})
}

// each individual APIs should be responsible for defining the relation and the object being accessed, subject will be derived from the request
func (middleware *AuthZ) Check(next http.HandlerFunc, relation string) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		checkRequestTupleKey := authtypes.NewTuple("", "", "")
		allow, err := middleware.authzService.Check(req.Context(), checkRequestTupleKey)
		if err != nil {
			render.Error(rw, err)
			return
		}

		if !allow {
			middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "tuple", checkRequestTupleKey)
			render.Error(rw, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "subject %s cannot %s resource %s", "", relation, ""))
			return
		}

		next(rw, req)
	})
}
