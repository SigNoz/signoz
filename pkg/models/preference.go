package models

import "github.com/uptrace/bun"

// on_delete:CASCADE,on_update:CASCADE not working
type UserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`

	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	UserID          string `bun:"user_id,type:text,notnull"`
	User            *User  `bun:"rel:belongs-to,join:user_id=id,pk,on_delete:CASCADE,on_update:CASCADE"`
}

// on_delete:CASCADE,on_update:CASCADE not working
type OrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`

	PreferenceID    string        `bun:"preference_id,type:text,notnull"`
	PreferenceValue string        `bun:"preference_value,type:text,notnull"`
	OrgID           string        `bun:"org_id,type:text,notnull"`
	Org             *Organization `bun:"rel:belongs-to,join:org_id=id,pk,on_delete:CASCADE,on_update:CASCADE"`
}
