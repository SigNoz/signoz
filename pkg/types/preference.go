package types

import "github.com/uptrace/bun"

// on_delete:CASCADE,on_update:CASCADE not working
type UserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	UserID          string `bun:"user_id,type:text,notnull"`
}

// on_delete:CASCADE,on_update:CASCADE not working
type OrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,type:text,notnull"`
}
