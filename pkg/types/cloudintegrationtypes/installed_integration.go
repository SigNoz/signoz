package cloudintegrationtypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

// --------------------------------------------------------------------------
// Normal integration uses just the installed_integration table
// --------------------------------------------------------------------------

type InstalledIntegration struct {
	bun.BaseModel `bun:"table:installed_integration"`

	types.Identifiable
	Type        string                     `json:"type" bun:"type,type:text,unique:org_id_type"`
	Config      InstalledIntegrationConfig `json:"config" bun:"config,type:text"`
	InstalledAt time.Time                  `json:"installed_at" bun:"installed_at,default:current_timestamp"`
	OrgID       string                     `json:"org_id" bun:"org_id,type:text,unique:org_id_type,references:organizations(id),on_delete:cascade"`
}

type InstalledIntegrationConfig map[string]any

// Scan scans value from DB.
func (c *InstalledIntegrationConfig) Scan(src any) error {
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, c)
}

// Value serializes the config to DB.
func (c *InstalledIntegrationConfig) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize integration config to JSON")
	}
	return filterSetJson, nil
}
