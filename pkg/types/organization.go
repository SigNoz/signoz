package types

import (
	"context"
	"hash/fnv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrOrganizationAlreadyExists = errors.MustNewCode("organization_already_exists")
	ErrOrganizationNotFound      = errors.MustNewCode("organization_not_found")
)

type Organization struct {
	bun.BaseModel `bun:"table:organizations"`
	TimeAuditable
	Identifiable
	Name        string `bun:"name,type:text,nullzero" json:"name"`
	Alias       string `bun:"alias,type:text,nullzero" json:"alias"`
	Key         uint32 `bun:"key,type:bigint,notnull" json:"key"`
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
}

func NewOrganization(displayName string) *Organization {
	id := valuer.GenerateUUID()
	return &Organization{
		Identifiable: Identifiable{
			ID: id,
		},
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		// Name: "default/main", TODO: take the call and uncomment this later
		DisplayName: displayName,
		Key:         NewOrganizationKey(id),
	}
}

func NewOrganizationKey(orgID valuer.UUID) uint32 {
	hasher := fnv.New32a()

	// Hasher never returns err.
	_, _ = hasher.Write([]byte(orgID.String()))
	return hasher.Sum32()
}

func NewTraitsFromOrganization(org *Organization) map[string]any {
	return map[string]any{
		"display_name": org.DisplayName,
		"name":         org.Name,
		"created_at":   org.CreatedAt,
		"alias":        org.Alias,
	}
}

type TTLSetting struct {
	bun.BaseModel `bun:"table:ttl_setting"`
	Identifiable
	TimeAuditable
	TransactionID  string `bun:"transaction_id,type:text,notnull"`
	TableName      string `bun:"table_name,type:text,notnull"`
	TTL            int    `bun:"ttl,notnull,default:0"`
	ColdStorageTTL int    `bun:"cold_storage_ttl,notnull,default:0"`
	Status         string `bun:"status,type:text,notnull"`
	OrgID          string `json:"-" bun:"org_id,notnull"`
	Condition      string `bun:"condition,type:text"`
}

type OrganizationStore interface {
	Create(context.Context, *Organization) error
	Get(context.Context, valuer.UUID) (*Organization, error)
	GetAll(context.Context) ([]*Organization, error)
	ListByKeyRange(context.Context, uint32, uint32) ([]*Organization, error)
	Update(context.Context, *Organization) error
	Delete(context.Context, valuer.UUID) error
}
