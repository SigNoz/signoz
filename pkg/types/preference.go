package types

import "github.com/uptrace/bun"

// on_delete:CASCADE,on_update:CASCADE not working
type UserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`

	PreferenceID    string `bun:"preference_id,type:text,pk"`
	PreferenceValue string `bun:"preference_value,type:text"`
	UserID          string `bun:"user_id,type:text,pk"`
}

// on_delete:CASCADE,on_update:CASCADE not working
type OrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`

	PreferenceID    string `bun:"preference_id,pk,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,pk,type:text,notnull"`
}
