package cloudintegrationtypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeCloudIntegrationNotFound             = errors.MustNewCode("cloud_integration_not_found")
	ErrCodeCloudIntegrationAlreadyExists        = errors.MustNewCode("cloud_integration_already_exists")
	ErrCodeCloudIntegrationServiceNotFound      = errors.MustNewCode("cloud_integration_service_not_found")
	ErrCodeCloudIntegrationServiceAlreadyExists = errors.MustNewCode("cloud_integration_service_already_exists")
)

// StorableCloudIntegration represents a cloud integration stored in the database.
// This is also referred as "Account" in the context of cloud integrations.
type StorableCloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`
	types.Identifiable
	types.TimeAuditable

	Provider        CloudProviderType    `bun:"provider,type:text"`
	Config          string               `bun:"config,type:text"` // Config is provider-specific data in JSON string format
	AccountID       *string              `bun:"account_id,type:text"`
	LastAgentReport *StorableAgentReport `bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time           `bun:"removed_at,type:timestamp,nullzero"`
	OrgID           valuer.UUID          `bun:"org_id,type:text"`
}

// StorableAgentReport represents the last heartbeat and arbitrary data sent by the agent
// as of now there is no use case for Data field, but keeping it for backwards compatibility with older structure.
type StorableAgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"` // backward compatibility
	Data            map[string]any `json:"data"`
}

// StorableCloudIntegrationService is to store service config for a cloud integration, which is a cloud provider specific configuration.
type StorableCloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`
	types.Identifiable
	types.TimeAuditable

	Type               ServiceID   `bun:"type,type:text,notnull"` // Keeping Type field name as is, but it is a service id
	Config             string      `bun:"config,type:text"`       // Config is cloud provider's service specific data in JSON string format
	CloudIntegrationID valuer.UUID `bun:"cloud_integration_id,type:text"`
}

// Scan scans value from DB.
func (r *StorableAgentReport) Scan(src any) error {
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}
	return json.Unmarshal(data, r)
}

// Value creates value to be stored in DB.
func (r *StorableAgentReport) Value() (driver.Value, error) {
	if r == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "agent report is nil")
	}

	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize agent report to JSON",
		)
	}
	// Return as string instead of []byte to ensure PostgreSQL stores as text, not bytes
	return string(serialized), nil
}
