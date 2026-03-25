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

func (m *module) CreateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "create account is not supported")
}

func (m *module) GetAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get account is not supported")
}

func (m *module) ListAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list accounts is not supported")
}

func (m *module) UpdateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "update account is not supported")
}

func (m *module) DisconnectAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "disconnect account is not supported")
}

func (m *module) CreateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "create service is not supported")
}

func (m *module) GetService(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID, serviceID string) (*cloudintegrationtypes.Service, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get service is not supported")
}

func (m *module) ListServicesMetadata(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID) ([]*cloudintegrationtypes.ServiceMetadata, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list services metadata is not supported")
}

func (m *module) UpdateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService) error {
	return errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "update service is not supported")
}

func (m *module) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get connection artifact is not supported")
}

func (m *module) AgentCheckIn(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, req *cloudintegrationtypes.AgentCheckInRequest) (*cloudintegrationtypes.AgentCheckInResponse, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "agent check-in is not supported")
}

func (m *module) GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "get dashboard by ID is not supported")
}

func (m *module) ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "list dashboards is not supported")
}

func (m *module) GetCloudProvider(provider cloudintegrationtypes.CloudProviderType) (cloudintegration.CloudProviderModule, error) {
	panic("unimplemented")
}
