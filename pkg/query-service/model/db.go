package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type Organization struct {
	Id              string `json:"id" db:"id"`
	Name            string `json:"name" db:"name"`
	CreatedAt       int64  `json:"createdAt" db:"created_at"`
	IsAnonymous     bool   `json:"isAnonymous" db:"is_anonymous"`
	HasOptedUpdates bool   `json:"hasOptedUpdates" db:"has_opted_updates"`
}

// InvitationObject represents the token object stored in the db
type InvitationObject struct {
	Id        string `json:"id" db:"id"`
	Email     string `json:"email" db:"email"`
	Name      string `json:"name" db:"name"`
	Token     string `json:"token" db:"token"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	Role      string `json:"role" db:"role"`
	OrgId     string `json:"orgId" db:"org_id"`
}

type User struct {
	Id                string `json:"id" db:"id"`
	Name              string `json:"name" db:"name"`
	Email             string `json:"email" db:"email"`
	Password          string `json:"password,omitempty" db:"password"`
	CreatedAt         int64  `json:"createdAt" db:"created_at"`
	ProfilePictureURL string `json:"profilePictureURL" db:"profile_picture_url"`
	OrgId             string `json:"orgId,omitempty" db:"org_id"`
	GroupId           string `json:"groupId,omitempty" db:"group_id"`
}

type ApdexSettings struct {
	ServiceName        string  `json:"serviceName" db:"service_name"`
	Threshold          float64 `json:"threshold" db:"threshold"`
	ExcludeStatusCodes string  `json:"excludeStatusCodes" db:"exclude_status_codes"` // sqlite doesn't support array type
}

type IngestionKey struct {
	KeyId        string    `json:"keyId" db:"key_id"`
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	IngestionKey string    `json:"ingestionKey" db:"ingestion_key"`
	IngestionURL string    `json:"ingestionURL" db:"ingestion_url"`
	DataRegion   string    `json:"dataRegion" db:"data_region"`
}

type UserFlag map[string]string

func (uf UserFlag) Value() (driver.Value, error) {
	f := make(map[string]string, 0)
	for k, v := range uf {
		f[k] = v
	}
	return json.Marshal(f)
}

func (uf *UserFlag) Scan(value interface{}) error {
	if value == "" {
		return nil
	}

	b, ok := value.(string)
	if !ok {
		return fmt.Errorf("type assertion to []byte failed while scanning user flag")
	}
	f := make(map[string]string, 0)
	if err := json.Unmarshal([]byte(b), &f); err != nil {
		return err
	}
	*uf = make(UserFlag, len(f))
	for k, v := range f {
		(*uf)[k] = v
	}
	return nil
}

type UserPayload struct {
	User
	Role         string   `json:"role"`
	Organization string   `json:"organization"`
	Flags        UserFlag `json:"flags"`
}

type Group struct {
	Id   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}
