package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/singleflight"
)

const (
	serviceAccountCrossOrgMessage string = "::SERVICE-ACCOUNT-CROSS-ORG::"
)

type ServiceAccount struct {
	store          sqlstore.SQLStore
	headers        []string
	logger         *slog.Logger
	sharder        sharder.Sharder
	serviceAccount serviceaccount.Module
	sfGroup        *singleflight.Group
}

func NewServiceAccount(store sqlstore.SQLStore, headers []string, logger *slog.Logger, sharder sharder.Sharder) *ServiceAccount {
	return &ServiceAccount{
		store:   store,
		headers: headers,
		logger:  logger,
		sharder: sharder,
		sfGroup: &singleflight.Group{},
	}
}

func (a *ServiceAccount) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string

		for _, header := range a.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := a.contextFromRequest(r.Context(), values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		r = r.WithContext(ctx)

		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		if err := a.sharder.IsMyOwnedKey(r.Context(), types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			a.logger.ErrorContext(r.Context(), serviceAccountCrossOrgMessage, "claims", claims, "error", err)
			next.ServeHTTP(w, r)
			return
		}

		ctx = ctxtypes.SetAuthType(ctx, ctxtypes.AuthTypeAPIKey)

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", ctxtypes.AuthTypeAPIKey.StringValue())
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)

		r = r.WithContext(ctxtypes.NewContextWithComment(ctx, comment))

		next.ServeHTTP(w, r)

		key, err := authtypes.ServiceAccountKeyFromContext(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		lastObservedAtCtx := context.WithoutCancel(r.Context())
		_, _, _ = a.sfGroup.Do(key, func() (any, error) {
			if err := a.serviceAccount.SetLastObservedAt(lastObservedAtCtx, key, time.Now()); err != nil {
				a.logger.ErrorContext(lastObservedAtCtx, "failed to set last observed at", "error", err)
				return false, err
			}

			return true, nil
		})

	})

}

func (a *ServiceAccount) contextFromRequest(ctx context.Context, values ...string) (context.Context, error) {
	ctx, err := a.contextFromServiceAccountKey(ctx, values...)
	if err != nil {
		return ctx, err
	}

	key, err := authtypes.ServiceAccountKeyFromContext(ctx)
	if err != nil {
		return ctx, err
	}

	serviceAccount, err := a.serviceAccount.GetByKey(ctx, key)
	if err != nil {
		return ctx, err
	}

	if serviceAccount.ExpiresAt != 0 {
		if time.Since(time.Now().AddDate(0, 0, int(serviceAccount.ExpiresAt))) < 0 {
			return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "the token has been expired!")
		}
	}

	return authtypes.NewContextWithClaims(ctx, serviceAccount.ToClaims()), nil
}

func (a *ServiceAccount) contextFromServiceAccountKey(ctx context.Context, values ...string) (context.Context, error) {
	var value string
	for _, v := range values {
		if v != "" {
			value = v
			break
		}
	}

	if value == "" {
		return ctx, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "missing authorization header")
	}

	return authtypes.NewContextWithServiceAccountKey(ctx, value), nil
}
