package implcloudintegration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct{}

func NewModule() cloudintegration.Module {
	return &module{}
}

func (module *module) GetConnectionCredentials(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Credentials, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get connection credentials is not supported")
}

func (module *module) CreateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "create account is not supported")
}

func (module *module) GetAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get account is not supported")
}

// GetConnectedAccount implements [cloudintegration.Module].
func (module *module) GetConnectedAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get connected account is not supported")
}

func (module *module) ListAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list accounts is not supported")
}

func (module *module) UpdateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "update account is not supported")
}

func (module *module) DisconnectAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "disconnect account is not supported")
}

func (module *module) CreateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService, provider cloudintegrationtypes.CloudProviderType) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "create service is not supported")
}

func (module *module) GetService(ctx context.Context, orgID valuer.UUID, serviceID cloudintegrationtypes.ServiceID, provider cloudintegrationtypes.CloudProviderType, integrationID valuer.UUID) (*cloudintegrationtypes.Service, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get service is not supported")
}

func (module *module) ListServicesMetadata(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, integrationID valuer.UUID) ([]*cloudintegrationtypes.ServiceMetadata, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list services metadata is not supported")
}

func (module *module) UpdateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService, provider cloudintegrationtypes.CloudProviderType) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "update service is not supported")
}

func (module *module) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get connection artifact is not supported")
}

func (module *module) AgentCheckIn(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, req *cloudintegrationtypes.AgentCheckInRequest) (*cloudintegrationtypes.AgentCheckInResponse, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "agent check-in is not supported")
}

func (module *module) GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get dashboard by ID is not supported")
}

func (module *module) ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list dashboards is not supported")
}

func (module *module) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "stats collection is not supported")
}
