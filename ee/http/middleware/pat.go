package middleware

import (
	"net/http"
	"time"

	eeTypes "github.com/SigNoz/signoz/ee/types"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

type Pat struct {
	store   sqlstore.SQLStore
	uuid    *authtypes.UUID
	headers []string
}

func NewPat(store sqlstore.SQLStore, headers []string) *Pat {
	return &Pat{store: store, uuid: authtypes.NewUUID(), headers: headers}
}

func (p *Pat) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		var patToken string
		var pat eeTypes.StorablePersonalAccessToken

		for _, header := range p.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := p.uuid.ContextFromRequest(r.Context(), values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		patToken, ok := authtypes.UUIDFromContext(ctx)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}

		err = p.store.BunDB().NewSelect().Model(&pat).Where("token = ?", patToken).Scan(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		if pat.ExpiresAt < time.Now().Unix() && pat.ExpiresAt != 0 {
			next.ServeHTTP(w, r)
			return
		}

		// get user from db
		user := types.User{}
		err = p.store.BunDB().NewSelect().Model(&user).Where("id = ?", pat.UserID).Scan(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		jwt := authtypes.Claims{
			UserID: user.ID,
			Role:   user.Role,
			Email:  user.Email,
			OrgID:  user.OrgID,
		}

		ctx = authtypes.NewContextWithClaims(ctx, jwt)

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)

		pat.LastUsed = time.Now().Unix()
		_, err = p.store.BunDB().NewUpdate().Model(&pat).Column("last_used").Where("token = ?", patToken).Where("revoked = false").Exec(r.Context())
		if err != nil {
			zap.L().Error("Failed to update PAT last used in db, err: %v", zap.Error(err))
		}

	})

}
