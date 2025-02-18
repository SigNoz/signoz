package types

import (
	"time"

	"github.com/uptrace/bun"
)

type AuditableModel struct {
	CreatedAt time.Time `bun:"created_at,notnull" json:"createdAt"`
	CreatedBy string    `bun:"created_by,notnull" json:"createdBy"`
	UpdatedAt time.Time `bun:"updated_at,notnull" json:"updatedAt"`
	UpdatedBy string    `bun:"updated_by,notnull" json:"updatedBy"`
}

// TODO: check constraints are not working
type Organization struct {
	bun.BaseModel `bun:"table:organizations"`

	AuditableModel
	ID              string `bun:"id,pk,type:text" json:"id"`
	Name            string `bun:"name,type:text,notnull" json:"name"`
	IsAnonymous     bool   `bun:"is_anonymous,notnull,default:0,CHECK(is_anonymous IN (0,1))" json:"isAnonymous"`
	HasOptedUpdates bool   `bun:"has_opted_updates,notnull,default:1,CHECK(has_opted_updates IN (0,1))" json:"hasOptedUpdates"`
}

type Invite struct {
	bun.BaseModel `bun:"table:invites"`

	ID        int    `bun:"id,pk,autoincrement"`
	Name      string `bun:"name,type:text,notnull"`
	Email     string `bun:"email,type:text,notnull,unique"`
	Token     string `bun:"token,type:text,notnull"`
	CreatedAt int    `bun:"created_at,notnull"`
	Role      string `bun:"role,type:text,notnull"`
	OrgID     string `bun:"org_id,type:text,notnull"`
}

type Group struct {
	bun.BaseModel `bun:"table:groups"`
	ID            string `bun:"id,pk,type:text" json:"id"`
	Name          string `bun:"name,type:text,notnull,unique" json:"name"`
}

type GettableUser struct {
	User
	Role         string    `json:"role"`
	Organization string    `json:"organization"`
	Flags        UserFlags `json:"flags"`
}

type User struct {
	bun.BaseModel     `bun:"table:users"`
	ID                string `bun:"id,pk,type:text"`
	Name              string `bun:"name,type:text,notnull"`
	Email             string `bun:"email,type:text,notnull,unique"`
	Password          string `bun:"password,type:text,notnull"`
	CreatedAt         int    `bun:"created_at,notnull"`
	ProfilePictureURL string `bun:"profile_picture_url,type:text"`
	GroupID           string `bun:"group_id,type:text,notnull"`
	OrgID             string `bun:"org_id,type:text,notnull"`
}

type ResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request"`
	ID            int    `bun:"id,pk,autoincrement"`
	Token         string `bun:"token,type:text,notnull"`
	UserID        string `bun:"user_id,type:text,notnull"`
}

type UserFlags struct {
	bun.BaseModel `bun:"table:user_flags"`
	UserID        string `bun:"user_id,pk,type:text,notnull"`
	Flags         string `bun:"flags,type:text"`
}

// func (uf UserFlags) Value() (driver.Value, error) {
// 	f := make(map[string]string, 0)
// 	for k, v := range uf {
// 		f[k] = v
// 	}
// 	return json.Marshal(f)
// }

// func (uf *UserFlags) Scan(value interface{}) error {
// 	if value == "" {
// 		return nil
// 	}

// 	b, ok := value.(string)
// 	if !ok {
// 		return fmt.Errorf("type assertion to []byte failed while scanning user flag")
// 	}
// 	f := make(map[string]string, 0)
// 	if err := json.Unmarshal([]byte(b), &f); err != nil {
// 		return err
// 	}
// 	*uf = make(UserFlags, len(f))
// 	for k, v := range f {
// 		(*uf)[k] = v
// 	}
// 	return nil
// }

type ApdexSettings struct {
	bun.BaseModel      `bun:"table:apdex_settings"`
	ServiceName        string  `bun:"service_name,pk,type:text"`
	Threshold          float64 `bun:"threshold,type:float,notnull"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull"`
}

type IngestionKey struct {
	bun.BaseModel `bun:"table:ingestion_keys"`
	KeyId         string    `bun:"key_id,pk,type:text"`
	Name          string    `bun:"name,type:text"`
	CreatedAt     time.Time `bun:"created_at,default:current_timestamp"`
	IngestionKey  string    `bun:"ingestion_key,type:text,notnull"`
	IngestionURL  string    `bun:"ingestion_url,type:text,notnull"`
	DataRegion    string    `bun:"data_region,type:text,notnull"`
}
