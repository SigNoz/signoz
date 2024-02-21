package integrations

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type InstalledIntegrationConfig map[string]interface{}

// For serializing to and from db
func (c *InstalledIntegrationConfig) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, &c)
	}
	return nil
}

func (c *InstalledIntegrationConfig) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(c)
	if err != nil {
		return nil, errors.Wrap(err, "could not serialize integration config to JSON")
	}
	return filterSetJson, nil
}

// Actual integration details are expected to be fetched from relevant AvailableIntegrationsRepo.
type InstalledIntegration struct {
	IntegrationId string                     `db:"integration_id"`
	Config        InstalledIntegrationConfig `db:"config_json"`
	InstalledAt   time.Time                  `db:"installed_at"`
}

type InstalledIntegrationsRepo interface {
	list(context.Context) ([]InstalledIntegration, *model.ApiError)
	get(ctx context.Context, integrationIds []string) (map[string]InstalledIntegration, *model.ApiError)
	upsert(context.Context, IntegrationDetails) (*InstalledIntegration, *model.ApiError)
	delete(ctx context.Context, integrationId string) *model.ApiError
}

type AvailableIntegrationsRepo interface {
	list(context.Context) ([]IntegrationDetails, *model.ApiError)
	get(ctx context.Context, integrationIds []string) (map[string]IntegrationDetails, *model.ApiError)

	// AvailableIntegrationsRepo implementations are expected to cache details of installed integrations for quick retrieval.
	// For v0 only bundled integrations are available, later versions are expected
	// to add methods in this interface for caching details for installed integrations locally
}
