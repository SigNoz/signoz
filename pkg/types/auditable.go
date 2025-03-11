package types

import "time"

type TimeAuditable struct {
	CreatedAt time.Time `bun:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
}

type UserAuditable struct {
	CreatedBy string `bun:"created_by" json:"createdBy"`
	UpdatedBy string `bun:"updated_by" json:"updatedBy"`
}
