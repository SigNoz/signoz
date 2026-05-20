package cloudintegrationtypes

import (
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type IntegrationDashboardProviderType struct{ valuer.String }

var IntegrationDashboardProviderCloudIntegration = IntegrationDashboardProviderType{valuer.NewString("cloud_integration")}

type StorableIntegrationDashboard struct {
	bun.BaseModel `bun:"table:integration_dashboard"`

	ID          string    `bun:"id,pk,type:text"`
	DashboardID string    `bun:"dashboard_id,type:text"`
	Provider    string    `bun:"provider,type:text"`
	Slug        string    `bun:"slug,type:text"`
	CreatedAt   time.Time `bun:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at"`
}

func NewStorableIntegrationDashboard(dashboardID string, provider IntegrationDashboardProviderType, slug string) *StorableIntegrationDashboard {
	now := time.Now()
	return &StorableIntegrationDashboard{
		ID:          valuer.GenerateUUID().StringValue(),
		DashboardID: dashboardID,
		Provider:    provider.StringValue(),
		Slug:        slug,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func IntegrationDashboardSlug(provider CloudProviderType, serviceID ServiceID, dashName string) string {
	return fmt.Sprintf("%s-%s-%s", provider.StringValue(), serviceID.StringValue(), dashName)
}

func IntegrationDashboardSlugPrefix(provider CloudProviderType, serviceID ServiceID) string {
	return fmt.Sprintf("%s-%s-", provider.StringValue(), serviceID.StringValue())
}
