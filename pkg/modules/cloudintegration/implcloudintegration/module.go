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

func (m *module) CreateConnectionArtifact(_ context.Context, _ valuer.UUID, _ cloudintegrationtypes.CloudProviderType, _ *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) GetAccountStatus(_ context.Context, _, _ valuer.UUID) (*cloudintegrationtypes.AccountStatus, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) ListConnectedAccounts(_ context.Context, _ valuer.UUID) (*cloudintegrationtypes.ConnectedAccounts, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) DisconnectAccount(_ context.Context, _, _ valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) UpdateAccountConfig(_ context.Context, _, _ valuer.UUID, _ *cloudintegrationtypes.UpdateAccountConfigRequest) (*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) ListServicesSummary(_ context.Context, _ valuer.UUID, _ *valuer.UUID) (*cloudintegrationtypes.ServicesSummary, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) GetService(_ context.Context, _ valuer.UUID, _ string, _ *valuer.UUID) (*cloudintegrationtypes.Service, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) UpdateServiceConfig(_ context.Context, _ string, _ valuer.UUID, _ *cloudintegrationtypes.UpdateServiceConfigRequest) (*cloudintegrationtypes.ServiceSummary, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) AgentCheckIn(_ context.Context, _ valuer.UUID, _ *cloudintegrationtypes.AgentCheckInRequest) (cloudintegrationtypes.AgentCheckInResponse, error) {
	return cloudintegrationtypes.AgentCheckInResponse{}, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) GetDashboardByID(_ context.Context, _ string, _ valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}

func (m *module) GetAllDashboards(_ context.Context, _ valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cloud integration is an enterprise feature")
}
