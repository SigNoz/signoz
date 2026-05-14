package middleware

import (
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

type AuthZCheckDef struct {
	Relation         authtypes.Relation
	Resource         coretypes.Resource
	SelectorCallback selectorCallbackWithClaimsFn
	Roles            []string
}

// AuthZCheckGroup is a set of checks OR'd together.
// At least one check in the group must pass for the group to pass.
type AuthZCheckGroup []AuthZCheckDef

type selectorCallbackWithClaimsFn func(*http.Request, authtypes.Claims) ([]coretypes.Selector, error)
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

func (middleware *AuthZ) Check(next http.HandlerFunc, relation authtypes.Relation, typeable coretypes.Resource, cb selectorCallbackWithClaimsFn, roles []string) http.HandlerFunc {
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

		roleSelectors := []coretypes.Selector{}
		for _, role := range roles {
			roleSelectors = append(roleSelectors, coretypes.TypeRole.MustSelector(role))
		}

		err = middleware.authzService.CheckWithTupleCreation(ctx, claims, valuer.MustNewUUID(claims.OrgID), relation, typeable, selectors, roleSelectors)
		if err != nil {
			render.Error(rw, err)
			return
		}

		next(rw, req)
	})
}

// CheckAll verifies groups of permission checks.
// Within each group, checks are OR'd (any check passing = group passes).
// Across groups, results are AND'd (all groups must pass).
//
// This model expresses any combination:
//   - Single check:          []AuthZCheckGroup{{checkA}}
//   - Pure AND:              []AuthZCheckGroup{{checkA}, {checkB}}
//   - Cross-resource OR:     []AuthZCheckGroup{{checkA, checkB}}
//   - Mixed (A OR B) AND C:  []AuthZCheckGroup{{checkA, checkB}, {checkC}}
func (middleware *AuthZ) CheckAll(next http.HandlerFunc, groups []AuthZCheckGroup) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			render.Error(rw, err)
			return
		}

		orgID := valuer.MustNewUUID(claims.OrgID)

		for _, group := range groups {
			groupPassed := false
			var lastErr error

			for _, check := range group {
				selectors, err := check.SelectorCallback(req, claims)
				if err != nil {
					render.Error(rw, err)
					return
				}

				roleSelectors := make([]coretypes.Selector, len(check.Roles))
				for idx, role := range check.Roles {
					roleSelectors[idx] = coretypes.TypeRole.MustSelector(role)
				}

				err = middleware.authzService.CheckWithTupleCreation(ctx, claims, orgID, check.Relation, check.Resource, selectors, roleSelectors)
				if err == nil {
					groupPassed = true
					break
				}
				lastErr = err
			}

			if !groupPassed {
				render.Error(rw, lastErr)
				return
			}
		}

		next(rw, req)
	})
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
