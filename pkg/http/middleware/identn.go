package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	identityCrossOrgMessage string = "::IDENTITY-CROSS-ORG::"
)

type IdentN struct {
	resolver identn.IdentNResolver
	sharder  sharder.Sharder
	logger   *slog.Logger
}

func NewIdentN(resolver identn.IdentNResolver, sharder sharder.Sharder, logger *slog.Logger) *IdentN {
	return &IdentN{
		resolver: resolver,
		sharder:  sharder,
		logger:   logger,
	}
}

func (m *IdentN) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idn := m.resolver.GetIdentN(r)
		if idn == nil {
			next.ServeHTTP(w, r)
			return
		}

		if pre, ok := idn.(identn.IdentNWithPreHook); ok {
			r = pre.Pre(r)
		}

		identity, err := idn.GetIdentity(r)
		if err != nil {
			// Only the code is logged, never the message. Provider errors are
			// built in store layers that interpolate the credential into the
			// message: the api key store formats the raw key into
			// "api key with key: %s doesn't exist.", and the tokenizer store
			// passes the access token to a format string with no verb, so fmt
			// appends it as %!(EXTRA string=...). The code is a static constant
			// and is what an operator actually needs to tell a rejected
			// assertion from a missing credential.
			_, code, _, _, _, _ := errors.Unwrapb(err)
			m.logger.WarnContext(r.Context(), "failed to resolve identity",
				slog.String("identn_provider", idn.Name().StringValue()),
				slog.String("identn_error_code", code.String()),
			)
			next.ServeHTTP(w, r)
			return
		}

		ctx := r.Context()
		claims := identity.ToClaims()
		if err := m.sharder.IsMyOwnedKey(ctx, types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			m.logger.ErrorContext(ctx, identityCrossOrgMessage, slog.Any("claims", claims), errors.Attr(err))
			next.ServeHTTP(w, r)
			return
		}

		ctx = authtypes.NewContextWithClaims(ctx, claims)

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("identn_provider", claims.IdentNProvider.StringValue())
		comment.Set("user_id", claims.UserID)
		comment.Set("service_account_id", claims.ServiceAccountID)
		comment.Set("principal", claims.Principal.StringValue())
		comment.Set("org_id", claims.OrgID)
		ctx = ctxtypes.NewContextWithComment(ctx, comment)

		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)

		if hook, ok := idn.(identn.IdentNWithPostHook); ok {
			hook.Post(context.WithoutCancel(r.Context()), r, claims)
		}
	})
}
