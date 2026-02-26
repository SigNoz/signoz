package serviceaccounttypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableFactorAPIKey struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	types.Identifiable
	types.TimeAuditable
	Key              string     `bun:"key"`
	ExpiresAt        *time.Time `bun:"created_at"`
	LastUsed         *time.Time `bun:"last_used"`
	ServiceAccountID string     `bun:"service_account_id"`
}

type FactorAPIKey struct {
	types.Identifiable
	types.TimeAuditable
	Key              string      `bun:"key"`
	ExpiresAt        *time.Time  `bun:"created_at"`
	LastUsed         *time.Time  `bun:"last_used"`
	ServiceAccountID valuer.UUID `bun:"service_account_id"`
}

type PostableFactorAPIKey struct {
	Name      string  `json:"name" required:"true"`
	ExpiresAt *string `json:"expires_at"`
}

type UpdatableFactorAPIKey struct {
	Name      string  `json:"name" required:"true"`
	ExpiresAt *string `json:"expires_at"`
}

func NewFactorAPIKey(expiresAt *time.Time, serviceAccountID valuer.UUID) *FactorAPIKey {
	return &FactorAPIKey{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		//todo[@vikrantgupta25] figure out the best way to generate this key
		Key:              valuer.GenerateUUID().String(),
		ExpiresAt:        expiresAt,
		LastUsed:         nil,
		ServiceAccountID: serviceAccountID,
	}
}

func NewStorableFactorAPIKey(factorAPIKey *FactorAPIKey) *StorableFactorAPIKey {
	return &StorableFactorAPIKey{
		Identifiable:     factorAPIKey.Identifiable,
		TimeAuditable:    factorAPIKey.TimeAuditable,
		Key:              factorAPIKey.Key,
		ExpiresAt:        factorAPIKey.ExpiresAt,
		LastUsed:         factorAPIKey.LastUsed,
		ServiceAccountID: factorAPIKey.ServiceAccountID.String(),
	}
}
