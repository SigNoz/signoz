package types

import (
	"context"
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
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
}

func NewOrganization(displayName string) *Organization {
	return &Organization{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		// Name: "default/main", TODO: take the call and uncomment this later
		DisplayName: displayName,
	}
}

type ApdexSettings struct {
	bun.BaseModel `bun:"table:apdex_setting"`
	Identifiable
	OrgID              string  `bun:"org_id,type:text" json:"orgId"`
	ServiceName        string  `bun:"service_name,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}

type OrganizationStore interface {
	Create(context.Context, *Organization) error
	Get(context.Context, valuer.UUID) (*Organization, error)
	GetAll(context.Context) ([]*Organization, error)
	Update(context.Context, *Organization) error
	Delete(context.Context, valuer.UUID) error
}
