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
	Name             string     `bun:"name"`
	Key              string     `bun:"key"`
	ExpiresAt        *time.Time `bun:"created_at"`
	LastUsed         *time.Time `bun:"last_used"`
	ServiceAccountID string     `bun:"service_account_id"`
}

type FactorAPIKey struct {
	types.Identifiable
	types.TimeAuditable
	Name             string      `json:"name" requrired:"true"`
	Key              string      `json:"key" required:"true"`
	ExpiresAt        *time.Time  `json:"created_at" required:"true"`
	LastUsed         *time.Time  `json:"last_used" required:"true"`
	ServiceAccountID valuer.UUID `json:"service_account_id" required:"true"`
}

type PostableFactorAPIKey struct {
	Name      string     `json:"name" required:"true"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type UpdatableFactorAPIKey struct {
	Name      string     `json:"name" required:"true"`
	ExpiresAt *time.Time `json:"expires_at"`
}

func NewFactorAPIKeyFromStorable(storable *StorableFactorAPIKey) *FactorAPIKey {
	return &FactorAPIKey{
		Identifiable:     storable.Identifiable,
		TimeAuditable:    storable.TimeAuditable,
		Name:             storable.Name,
		Key:              storable.Key,
		ExpiresAt:        storable.ExpiresAt,
		LastUsed:         storable.LastUsed,
		ServiceAccountID: valuer.MustNewUUID(storable.ServiceAccountID),
	}
}

func NewFactorAPIKeyFromStorables(storables []*StorableFactorAPIKey) []*FactorAPIKey {
	factorAPIKeys := make([]*FactorAPIKey, len(storables))

	for idx, storable := range storables {
		factorAPIKeys[idx] = NewFactorAPIKeyFromStorable(storable)
	}

	return factorAPIKeys
}

func NewStorableFactorAPIKey(factorAPIKey *FactorAPIKey) *StorableFactorAPIKey {
	return &StorableFactorAPIKey{
		Identifiable:     factorAPIKey.Identifiable,
		TimeAuditable:    factorAPIKey.TimeAuditable,
		Name:             factorAPIKey.Name,
		Key:              factorAPIKey.Key,
		ExpiresAt:        factorAPIKey.ExpiresAt,
		LastUsed:         factorAPIKey.LastUsed,
		ServiceAccountID: factorAPIKey.ServiceAccountID.String(),
	}
}

func (apiKey *FactorAPIKey) Update(name string, expiresAt *time.Time) {
	apiKey.Name = name
	apiKey.ExpiresAt = expiresAt
	apiKey.UpdatedAt = time.Now()
}
