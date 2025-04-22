package integrations

import (
	"context"
	"slices"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/auth"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/google/uuid"
)

func NewTestIntegrationsManager(t *testing.T) *Manager {
	testDB := utils.NewQueryServiceDBForTests(t)

	installedIntegrationsRepo, err := NewInstalledIntegrationsSqliteRepo(testDB)
	if err != nil {
		t.Fatalf("could not init sqlite DB for installed integrations: %v", err)
	}

	return &Manager{
		availableIntegrationsRepo: &TestAvailableIntegrationsRepo{},
		installedIntegrationsRepo: installedIntegrationsRepo,
	}
}

func createTestUser() (*types.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	org, apiErr := dao.DB().CreateOrg(ctx, &types.Organization{
		Name: "test",
	})
	if apiErr != nil {
		return nil, apiErr
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, constants.AdminGroup)
	if apiErr != nil {
		return nil, apiErr
	}

	auth.InitAuthCache(ctx)

	userId := uuid.NewString()
	return dao.DB().CreateUser(
		ctx,
		&types.User{
			ID:       userId,
			Name:     "test",
			Email:    userId[:8] + "test@test.com",
			Password: "test",
			OrgID:    org.ID,
			GroupID:  group.ID,
		},
		true,
	)
}

type TestAvailableIntegrationsRepo struct{}

func (t *TestAvailableIntegrationsRepo) list(
	ctx context.Context,
) ([]IntegrationDetails, *model.ApiError) {
	return []IntegrationDetails{
		{
			IntegrationSummary: IntegrationSummary{
				Id:          "test-integration-1",
				Title:       "Test Integration 1",
				Description: "A test integration",
				Author: IntegrationAuthor{
					Name:     "signoz",
					Email:    "integrations@signoz.io",
					HomePage: "https://signoz.io",
				},
				Icon: `data:image/svg+xml;utf8,<svg ... > ... </svg>`,
			},
			Categories: []string{"testcat1", "testcat2"},
			Overview:   "test integration overview",
			Configuration: []IntegrationConfigStep{
				{
					Title:        "Step 1",
					Instructions: "Set source attrib on your signals",
				},
			},
			DataCollected: DataCollectedForIntegration{
				Logs:    []CollectedLogAttribute{},
				Metrics: []CollectedMetric{},
			},
			Assets: IntegrationAssets{
				Logs: LogsAssets{
					Pipelines: []pipelinetypes.PostablePipeline{
						{
							Name:    "pipeline1",
							Alias:   "pipeline1",
							Enabled: true,
							Filter: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "source",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
										},
										Operator: "=",
										Value:    "nginx",
									},
								},
							},
							Config: []pipelinetypes.PipelineOperator{
								{
									OrderId: 1,
									ID:      "add",
									Type:    "add",
									Field:   "attributes.test",
									Value:   "val",
									Enabled: true,
									Name:    "test add",
								},
							},
						},
					},
				},
				Dashboards: []types.DashboardData{},
				Alerts:     []ruletypes.PostableRule{},
			},
			ConnectionTests: &IntegrationConnectionTests{
				Logs: &LogsConnectionTest{
					AttributeKey:   "source",
					AttributeValue: "nginx",
				},
			},
		}, {
			IntegrationSummary: IntegrationSummary{
				Id:          "test-integration-2",
				Title:       "Test Integration 2",
				Description: "Another test integration",
				Author: IntegrationAuthor{
					Name:     "signoz",
					Email:    "integrations@signoz.io",
					HomePage: "https://signoz.io",
				},
				Icon: `data:image/svg+xml;utf8,<svg ... > ... </svg>`,
			},
			Categories: []string{"testcat1", "testcat2"},
			Overview:   "test integration overview",
			Configuration: []IntegrationConfigStep{
				{
					Title:        "Step 1",
					Instructions: "Set source attrib on your signals",
				},
			},
			DataCollected: DataCollectedForIntegration{
				Logs:    []CollectedLogAttribute{},
				Metrics: []CollectedMetric{},
			},
			Assets: IntegrationAssets{
				Logs: LogsAssets{
					Pipelines: []pipelinetypes.PostablePipeline{
						{
							Name:    "pipeline2",
							Alias:   "pipeline2",
							Enabled: true,
							Filter: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "source",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
										},
										Operator: "=",
										Value:    "redis",
									},
								},
							},
							Config: []pipelinetypes.PipelineOperator{
								{
									OrderId: 1,
									ID:      "add",
									Type:    "add",
									Field:   "attributes.test",
									Value:   "val",
									Enabled: true,
									Name:    "test add",
								},
							},
						},
					},
				},
				Dashboards: []types.DashboardData{},
				Alerts:     []ruletypes.PostableRule{},
			},
			ConnectionTests: &IntegrationConnectionTests{
				Logs: &LogsConnectionTest{
					AttributeKey:   "source",
					AttributeValue: "nginx",
				},
			},
		},
	}, nil
}

func (t *TestAvailableIntegrationsRepo) get(
	ctx context.Context, ids []string,
) (map[string]IntegrationDetails, *model.ApiError) {
	availableIntegrations, apiErr := t.list(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	result := map[string]IntegrationDetails{}

	for _, ai := range availableIntegrations {
		if slices.Contains(ids, ai.Id) {
			result[ai.Id] = ai
		}
	}

	return result, nil
}
