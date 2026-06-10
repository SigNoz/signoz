package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const (
	authzDeniedMessage string = "::AUTHZ-DENIED::"
)

type selectorCallbackWithoutClaimsFn func(*http.Request, []*types.Organization) ([]coretypes.Selector, valuer.UUID, error)

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

		selectors := []coretypes.Selector{
			coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName),
			coretypes.TypeRole.MustSelector(authtypes.SigNozEditorRoleName),
			coretypes.TypeRole.MustSelector(authtypes.SigNozViewerRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.Relation{Verb: coretypes.VerbAssignee},
			coretypes.NewResourceRole(),
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, slog.Any("claims", claims))
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

		selectors := []coretypes.Selector{
			coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName),
			coretypes.TypeRole.MustSelector(authtypes.SigNozEditorRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.Relation{Verb: coretypes.VerbAssignee},
			coretypes.NewResourceRole(),
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, slog.Any("claims", claims))
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

		selectors := []coretypes.Selector{
			coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.Relation{Verb: coretypes.VerbAssignee},
			coretypes.NewResourceRole(),
			selectors,
			selectors,
		)
		if err != nil {
			middleware.logger.WarnContext(ctx, authzDeniedMessage, slog.Any("claims", claims))
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

		selectors := []coretypes.Selector{
			coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName),
		}

		err = middleware.authzService.CheckWithTupleCreation(
			req.Context(),
			claims,
			valuer.MustNewUUID(claims.OrgID),
			authtypes.Relation{Verb: coretypes.VerbAssignee},
			coretypes.NewResourceRole(),
			selectors,
			selectors,
		)

		if err != nil {
			id := mux.Vars(req)["id"]
			if err := claims.IsSelfAccess(id); err != nil {
				middleware.logger.WarnContext(req.Context(), authzDeniedMessage, slog.Any("claims", claims))
				render.Error(rw, err)
				return
			}
		}
		next(rw, req)
	})
}

func (middleware *AuthZ) OpenAccess(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		next(rw, req)
	})
}

// CheckResources authorizes every resolved resource for the route. roles are the
// allowed role names (the OSS role-gate); the resource selectors drive the EE check.
func (middleware *AuthZ) CheckResources(next http.HandlerFunc, roles ...string) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		resolved, err := coretypes.ResolvedResourcesFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		orgID := valuer.MustNewUUID(claims.OrgID)

		roleSelectors := make([]coretypes.Selector, len(roles))
		for idx, role := range roles {
			roleSelectors[idx] = coretypes.TypeRole.MustSelector(role)
		}

		for _, resource := range resolved {
			if err := middleware.checkResource(ctx, claims, orgID, resource.Verb(), resource.SourceResource(), resource.SourceIDs(), resource.SourceSelector(), roleSelectors); err != nil {
				render.Error(rw, err)
				return
			}

			target, ok := resource.(coretypes.ResolvedResourceWithTargetResource)
			if ok && !target.IsParentChild() {
				if err := middleware.checkResource(ctx, claims, orgID, target.Verb(), target.TargetResource(), target.TargetIDs(), target.TargetSelector(), roleSelectors); err != nil {
					render.Error(rw, err)
					return
				}
			}
		}

		next(rw, req)
	})
}

func (middleware *AuthZ) checkResource(
	ctx context.Context,
	claims authtypes.Claims,
	orgID valuer.UUID,
	verb coretypes.Verb,
	resource coretypes.Resource,
	ids []string,
	selector coretypes.SelectorFunc,
	roleSelectors []coretypes.Selector,
) error {
	if selector == nil {
		return errors.New(errors.TypeInternal, errors.CodeInternal, "resolved resource is missing a selector")
	}

	for _, id := range ids {
		selectors, err := selector(ctx, resource, id, orgID)
		if err != nil {
			return err
		}

		err = middleware.authzService.CheckWithTupleCreation(
			ctx,
			claims,
			orgID,
			authtypes.Relation{Verb: verb},
			resource,
			selectors,
			roleSelectors,
		)
		if err == nil {
			continue
		}

		if !errors.Asc(err, authtypes.ErrCodeAuthZForbidden) {
			return err
		}

		middleware.logger.WarnContext(ctx, authzDeniedMessage, slog.Any("claims", claims))
		principal := fmt.Sprintf("%s/%s", claims.Principal.StringValue(), claims.IdentityID())
		if id != "" {
			return errors.Newf(
				errors.TypeForbidden,
				authtypes.ErrCodeAuthZForbidden,
				"%s is not authorized to perform %s on resource %q",
				principal,
				resource.Scope(verb),
				id,
			)
		}

		return errors.Newf(
			errors.TypeForbidden,
			authtypes.ErrCodeAuthZForbidden,
			"%s is not authorized to perform %s",
			principal,
			resource.Scope(verb),
		)
	}

	return nil
}

func (middleware *AuthZ) CheckWithoutClaims(next http.HandlerFunc, relation authtypes.Relation, typeable coretypes.Resource, cb selectorCallbackWithoutClaimsFn, roles []string) http.HandlerFunc {
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

		roleSelectors := []coretypes.Selector{}
		for _, role := range roles {
			roleSelectors = append(roleSelectors, coretypes.TypeRole.MustSelector(role))
		}

		err = middleware.authzService.CheckWithTupleCreationWithoutClaims(ctx, orgId, relation, typeable, selectors, roleSelectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}
