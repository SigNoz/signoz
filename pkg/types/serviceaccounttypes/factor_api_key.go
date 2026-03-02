package serviceaccounttypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeServiceAccountFactorAPIkeyInvalidInput  = errors.MustNewCode("service_account_factor_api_key_invalid_input")
	ErrCodeServiceAccountFactorAPIKeyAlreadyExists = errors.MustNewCode("service_account_factor_api_key_already_exists")
	ErrCodeServiceAccounFactorAPIKeytNotFound      = errors.MustNewCode("service_account_factor_api_key_not_found")
)

type StorableFactorAPIKey struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	types.Identifiable
	types.TimeAuditable
	Name             string    `bun:"name"`
	Key              string    `bun:"key"`
	ExpiresAt        uint64    `bun:"expires_at"`
	LastUsed         time.Time `bun:"last_used"`
	ServiceAccountID string    `bun:"service_account_id"`
}

type FactorAPIKey struct {
	types.Identifiable
	types.TimeAuditable
	Name             string      `json:"name" requrired:"true"`
	Key              string      `json:"key" required:"true"`
	ExpiresAt        uint64      `json:"expires_at" required:"true"`
	LastUsed         time.Time   `json:"last_used" required:"true"`
	ServiceAccountID valuer.UUID `json:"service_account_id" required:"true"`
}

type GettableFactorAPIKeyWithKey struct {
	types.Identifiable
	Key string `json:"key" required:"true"`
}

type GettableFactorAPIKey struct {
	types.Identifiable
	types.TimeAuditable
	Name             string      `json:"name" requrired:"true"`
	ExpiresAt        uint64      `json:"expires_at" required:"true"`
	LastUsed         time.Time   `json:"last_used" required:"true"`
	ServiceAccountID valuer.UUID `json:"service_account_id" required:"true"`
}

type PostableFactorAPIKey struct {
	Name      string `json:"name" required:"true"`
	ExpiresAt uint64 `json:"expires_at" required:"true"`
}

type UpdatableFactorAPIKey struct {
	Name      string `json:"name" required:"true"`
	ExpiresAt uint64 `json:"expires_at" required:"true"`
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

func NewGettableFactorAPIKeys(keys []*FactorAPIKey) []*GettableFactorAPIKey {
	gettables := make([]*GettableFactorAPIKey, len(keys))

	for idx, key := range keys {
		gettables[idx] = &GettableFactorAPIKey{
			Identifiable:     key.Identifiable,
			TimeAuditable:    key.TimeAuditable,
			Name:             key.Name,
			ExpiresAt:        key.ExpiresAt,
			LastUsed:         key.LastUsed,
			ServiceAccountID: key.ServiceAccountID,
		}
	}

	return gettables
}

func NewGettableFactorAPIKeyWithKey(id valuer.UUID, key string) *GettableFactorAPIKeyWithKey {
	return &GettableFactorAPIKeyWithKey{
		Identifiable: types.Identifiable{
			ID: id,
		},
		Key: key,
	}
}

func (apiKey *FactorAPIKey) Update(name string, expiresAt uint64) {
	apiKey.Name = name
	apiKey.ExpiresAt = expiresAt
	apiKey.UpdatedAt = time.Now()
}

func (key *PostableFactorAPIKey) UnmarshalJSON(data []byte) error {
	type Alias PostableFactorAPIKey

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountFactorAPIkeyInvalidInput, "name cannot be empty")
	}

	*key = PostableFactorAPIKey(temp)
	return nil
}

func (key *UpdatableFactorAPIKey) UnmarshalJSON(data []byte) error {
	type Alias UpdatableFactorAPIKey

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountFactorAPIkeyInvalidInput, "name cannot be empty")
	}

	*key = UpdatableFactorAPIKey(temp)
	return nil
}
