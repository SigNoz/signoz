package integrationstypes

import (
	"database/sql/driver"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// CloudProviderType type alias
type CloudProviderType = valuer.String

var (
	CloudProviderAWS = valuer.NewString("aws")
)

var (
	CodeCloudProviderInvalidInput = errors.MustNewCode("invalid_cloud_provider")
)

func NewCloudProvider(provider string) (CloudProviderType, error) {
	switch provider {
	case CloudProviderAWS.String():
		return valuer.NewString(provider), nil
	default:
		return CloudProviderType{}, errors.NewInvalidInputf(CodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider)
	}
}

var (
	AWSIntegrationUserEmail = valuer.MustNewEmail("aws-integration@signoz.io")
)

var IntegrationUserEmails = []valuer.Email{
	AWSIntegrationUserEmail,
}

func IsCloudIntegrationDashboardUuid(dashboardUuid string) bool {
	parts := strings.SplitN(dashboardUuid, "--", 4)
	if len(parts) != 4 {
		return false
	}

	return parts[0] == "cloud-integration"
}

func GetCloudProviderFromDashboardID(dashboardUuid string) (CloudProviderType, error) {
	parts := strings.SplitN(dashboardUuid, "--", 4)
	if len(parts) != 4 {
		return valuer.String{}, errors.NewInvalidInputf(CodeCloudProviderInvalidInput, "invalid dashboard uuid: %s", dashboardUuid)
	}

	providerStr := parts[1]

	cloudProvider, err := NewCloudProvider(providerStr)
	if err != nil {
		return CloudProviderType{}, err
	}

	return cloudProvider, nil
}

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

type InstalledIntegrationConfig map[string]interface{}

// Scan scans data from db
func (c *InstalledIntegrationConfig) Scan(src interface{}) error {
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

// Value serializes data to db
func (c *InstalledIntegrationConfig) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize integration config to JSON")
	}
	return filterSetJson, nil
}
