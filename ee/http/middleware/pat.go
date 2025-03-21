package middleware

import (
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Pat struct {
	db      *bun.DB
	uuid    *authtypes.UUID
	headers []string
}

func NewPat(db *bun.DB, headers []string) *Pat {
	return &Pat{db: db, uuid: authtypes.NewUUID(), headers: headers}
}

func (p *Pat) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		var patToken string
		var pat types.StorablePersonalAccessToken

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

		err = p.db.NewSelect().Model(&pat).Where("token = ?", patToken).Scan(r.Context())
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
		err = p.db.NewSelect().Model(&user).Where("id = ?", pat.UserID).Scan(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		jwt := authtypes.Claims{
			UserID:  user.ID,
			GroupID: user.GroupID,
			Email:   user.Email,
			OrgID:   user.OrgID,
		}

		ctx = authtypes.NewContextWithClaims(ctx, jwt)

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)

		pat.LastUsed = time.Now().Unix()
		_, err = p.db.NewUpdate().Model(&pat).Column("last_used").Where("token = ?", patToken).Where("revoked = false").Exec(r.Context())
		if err != nil {
			zap.L().Error("Failed to update PAT last used in db, err: %v", zap.Error(err))
		}

	})

}
