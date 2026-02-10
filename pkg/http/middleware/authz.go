package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const (
	authzDeniedMessage string = "::AUTHZ-DENIED::"
)

type AuthZ struct {
	logger       *slog.Logger
	orgGetter    organization.Getter
	authzService authz.AuthZ
}

func NewAuthZ(logger *slog.Logger, orgGetter organization.Getter, authzService authz.AuthZ) *AuthZ {
	if logger == nil {
		panic("cannot build authz middleware, logger is empty")
	}

	return &AuthZ{logger: logger, orgGetter: orgGetter, authzService: authzService}
}

func (middleware *AuthZ) ViewAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		commentCtx := ctxtypes.CommentFromContext(ctx)
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsViewer(); err != nil {
				middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		selectors := []authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozAdminRoleName),
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozEditorRoleName),
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozViewerRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.RelationAssignee,
			authtypes.TypeableRole,
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
			if errors.Asc(err, authtypes.ErrCodeAuthZForbidden) {
				render.Error(rw, errors.New(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "only viewers/editors/admins can access this resource"))
				return
			}

			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) EditAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		commentCtx := ctxtypes.CommentFromContext(ctx)
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsEditor(); err != nil {
				middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		selectors := []authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozAdminRoleName),
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozEditorRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.RelationAssignee,
			authtypes.TypeableRole,
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
			if errors.Asc(err, authtypes.ErrCodeAuthZForbidden) {
				render.Error(rw, errors.New(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "only editors/admins can access this resource"))
				return
			}

			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) AdminAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		commentCtx := ctxtypes.CommentFromContext(ctx)
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsAdmin(); err != nil {
				middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		selectors := []authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, roletypes.SigNozAdminRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.RelationAssignee,
			authtypes.TypeableRole,
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, "claims", claims)
			if errors.Asc(err, authtypes.ErrCodeAuthZForbidden) {
				render.Error(rw, errors.New(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "only admins can access this resource"))
				return
			}

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

func (middleware *AuthZ) Check(next http.HandlerFunc, relation authtypes.Relation, typeable authtypes.Typeable, cb authtypes.SelectorCallbackWithClaimsFn, roles []string) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		selectors, err := cb(req, claims)
		if err != nil {
			render.Error(rw, err)
			return
		}

		roleSelectors := []authtypes.Selector{}
		for _, role := range roles {
			roleSelectors = append(roleSelectors, authtypes.MustNewSelector(authtypes.TypeRole, role))
		}

		err = middleware.authzService.CheckWithTupleCreation(ctx, claims, valuer.MustNewUUID(claims.OrgID), relation, typeable, selectors, roleSelectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) CheckWithoutClaims(next http.HandlerFunc, relation authtypes.Relation, typeable authtypes.Typeable, cb authtypes.SelectorCallbackWithoutClaimsFn, roles []string) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		orgs, err := middleware.orgGetter.ListByOwnedKeyRange(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		selectors, orgId, err := cb(req, orgs)
		if err != nil {
			render.Error(rw, err)
			return
		}

		roleSelectors := []authtypes.Selector{}
		for _, role := range roles {
			roleSelectors = append(roleSelectors, authtypes.MustNewSelector(authtypes.TypeRole, role))
		}

		err = middleware.authzService.CheckWithTupleCreationWithoutClaims(ctx, orgId, relation, typeable, selectors, roleSelectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}
