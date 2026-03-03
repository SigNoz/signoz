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
	ErrCodeAPIkeyInvalidInput        = errors.MustNewCode("api_key_invalid_input")
	ErrCodeAPIKeyAlreadyExists       = errors.MustNewCode("api_key_already_exists")
	ErrCodeAPIKeytNotFound           = errors.MustNewCode("api_key_not_found")
	ErrCodeAPIKeyExpired             = errors.MustNewCode("api_key_expired")
	ErrCodeAPIkeyOlderLastObservedAt = errors.MustNewCode("api_key_older_last_observed_at")
)

type StorableFactorAPIKey struct {
	bun.BaseModel `bun:"table:factor_api_key,alias:factor_api_key"`

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

func (apiKey *FactorAPIKey) IsExpired() error {
	if apiKey.ExpiresAt == 0 {
		return nil
	}

	if !time.Now().After(time.Unix(int64(apiKey.ExpiresAt), 0)) {
		return errors.New(errors.TypeUnauthenticated, ErrCodeAPIKeyExpired, "api key has been expired")
	}

	return nil
}

func (apiKey *FactorAPIKey) UpdateLastObservedAt(lastObservedAt time.Time) error {
	if lastObservedAt.Before(apiKey.LastUsed) {
		return errors.New(errors.TypeInvalidInput, ErrCodeAPIkeyOlderLastObservedAt, "last observed at is before the current last observed at")
	}

	apiKey.LastUsed = lastObservedAt
	apiKey.UpdatedAt = time.Now()

	return nil
}

func (key *PostableFactorAPIKey) UnmarshalJSON(data []byte) error {
	type Alias PostableFactorAPIKey

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAPIkeyInvalidInput, "name cannot be empty")
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
		return errors.New(errors.TypeInvalidInput, ErrCodeAPIkeyInvalidInput, "name cannot be empty")
	}

	*key = UpdatableFactorAPIKey(temp)
	return nil
}

func (key FactorAPIKey) MarshalBinary() ([]byte, error) {
	return json.Marshal(key)
}

func (key *FactorAPIKey) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, key)
}
