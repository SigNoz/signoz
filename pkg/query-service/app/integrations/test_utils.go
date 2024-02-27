package integrations

import (
	"context"
	"slices"
	"testing"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// TODO(Raj): Maybe move this to project level utils
// and use the same helper in integration tests too

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
			Assets: IntegrationAssets{
				Logs: LogsAssets{
					Pipelines: []logparsingpipeline.PostablePipeline{
						{
							Name:    "pipeline1",
							Alias:   "pipeline1",
							Enabled: true,
							Filter: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "method",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
										},
										Operator: "=",
										Value:    "GET",
									},
								},
							},
							Config: []logparsingpipeline.PipelineOperator{
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
			Assets: IntegrationAssets{
				Logs: LogsAssets{
					Pipelines: []logparsingpipeline.PostablePipeline{
						{
							Name:    "pipeline2",
							Alias:   "pipeline2",
							Enabled: true,
							Filter: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "method",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
										},
										Operator: "=",
										Value:    "GET",
									},
								},
							},
							Config: []logparsingpipeline.PipelineOperator{
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
