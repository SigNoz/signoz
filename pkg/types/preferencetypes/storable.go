package preferencetypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type StorableOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,type:text,notnull"`
}

type StorableUserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	UserID          string `bun:"user_id,type:text,notnull"`
}

type PreferenceStore interface {
	GetOrgPreference(context.Context, string, string) (*StorableOrgPreference, error)
	GetAllOrgPreferences(context.Context, string) ([]*StorableOrgPreference, error)
	UpsertOrgPreference(context.Context, *StorableOrgPreference) error
	GetUserPreference(context.Context, string, string) (*StorableUserPreference, error)
	GetAllUserPreferences(context.Context, string) ([]*StorableUserPreference, error)
	UpsertUserPreference(context.Context, *StorableUserPreference) error
}
