package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/role"
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
	roleGetter   role.Getter
}

func NewAuthZ(logger *slog.Logger, orgGetter organization.Getter, authzService authz.AuthZ, roleGetter role.Getter) *AuthZ {
	if logger == nil {
		panic("cannot build authz middleware, logger is empty")
	}

	return &AuthZ{logger: logger, orgGetter: orgGetter, authzService: authzService, roleGetter: roleGetter}
}

func (middleware *AuthZ) ViewAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		commentCtx := ctxtypes.CommentFromContext(req.Context())
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsViewer(); err != nil {
				middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		orgId, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozViewer, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozViewerRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozEditor, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozEditorRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozAdmin, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozAdminRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = middleware.authzService.CheckWithTupleCreation(req.Context(), claims, orgId, authtypes.RelationAssignee, authtypes.RelationAssignee, authtypes.TypeableRole, []authtypes.Selector{authtypes.MustNewSelector(authtypes.TypeRole, signozViewer.ID.String()), authtypes.MustNewSelector(authtypes.TypeRole, signozEditor.ID.String()), authtypes.MustNewSelector(authtypes.TypeRole, signozAdmin.ID.String())})
		if err != nil {
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

		commentCtx := ctxtypes.CommentFromContext(req.Context())
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsEditor(); err != nil {
				middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		orgId, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozEditor, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozEditorRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozAdmin, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozAdminRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = middleware.authzService.CheckWithTupleCreation(req.Context(), claims, orgId, authtypes.RelationAssignee, authtypes.RelationAssignee, authtypes.TypeableRole, []authtypes.Selector{authtypes.MustNewSelector(authtypes.TypeRole, signozEditor.ID.String()), authtypes.MustNewSelector(authtypes.TypeRole, signozAdmin.ID.String())})
		if err != nil {
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

		commentCtx := ctxtypes.CommentFromContext(req.Context())
		authtype, ok := commentCtx.Map()["auth_type"]
		if ok && authtype == ctxtypes.AuthTypeAPIKey.StringValue() {
			if err := claims.IsAdmin(); err != nil {
				middleware.logger.WarnContext(req.Context(), authzDeniedMessage, "claims", claims)
				render.Error(rw, err)
				return
			}

			next(rw, req)
			return
		}

		orgId, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			render.Error(rw, err)
			return
		}

		signozAdmin, err := middleware.roleGetter.GetByOrgIDAndName(req.Context(), orgId, roletypes.SigNozAdminRoleName)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = middleware.authzService.CheckWithTupleCreation(req.Context(), claims, orgId, authtypes.RelationAssignee, authtypes.RelationAssignee, authtypes.TypeableRole, []authtypes.Selector{authtypes.MustNewSelector(authtypes.TypeRole, signozAdmin.ID.String())})
		if err != nil {
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

func (middleware *AuthZ) Check(next http.HandlerFunc, relation authtypes.Relation, translation authtypes.Relation, typeable authtypes.Typeable, cb authtypes.SelectorCallbackWithClaimsFn) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		claims, err := authtypes.ClaimsFromContext(req.Context())
		if err != nil {
			render.Error(rw, err)
			return
		}

		orgId, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			render.Error(rw, err)
			return
		}

		selectors, err := cb(req, claims)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = middleware.authzService.CheckWithTupleCreation(req.Context(), claims, orgId, relation, translation, typeable, selectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) CheckWithoutClaims(next http.HandlerFunc, relation authtypes.Relation, translation authtypes.Relation, typeable authtypes.Typeable, cb authtypes.SelectorCallbackWithoutClaimsFn) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		orgs, err := middleware.orgGetter.ListByOwnedKeyRange(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		selectors, orgID, err := cb(req, orgs)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = middleware.authzService.CheckWithTupleCreationWithoutClaims(ctx, orgID, relation, translation, typeable, selectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}
