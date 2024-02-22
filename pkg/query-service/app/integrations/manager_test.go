package integrations

import (
	"context"
	"os"
	"slices"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestIntegrationLifecycle(t *testing.T) {
	require := require.New(t)

	mgr := NewTestManager(t)
	ctx := context.Background()

	installedIntegrations, apiErr := mgr.ListInstalledIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal([]Integration{}, installedIntegrations)

	availableIntegrations, apiErr := mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)

	installed, apiErr := mgr.InstallIntegration(ctx, availableIntegrations[1].Id)
	require.Nil(apiErr)
	require.Equal(installed.Id, availableIntegrations[1].Id)

	availableIntegrations, apiErr = mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.True(availableIntegrations[1].IsInstalled)

	apiErr = mgr.UninstallIntegration(ctx, installed.Id)
	require.Nil(apiErr)

	availableIntegrations, apiErr = mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)
}

type TestAvailableIntegrations struct{}

func (t *TestAvailableIntegrations) list(
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
			},
			IntegrationAssets: IntegrationAssets{
				LogPipeline: &logparsingpipeline.PostablePipeline{
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
			},
			IntegrationAssets: IntegrationAssets{
				LogPipeline: &logparsingpipeline.PostablePipeline{
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
	}, nil
}

func (t *TestAvailableIntegrations) get(
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

func NewTestManager(t *testing.T) *Manager {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	testDB, err := sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		t.Fatalf("could not open test db sqlite file: %v", err)
	}
	installedIntegrationsRepo, err := NewInstalledIntegrationsSqliteRepo(testDB)
	if err != nil {
		t.Fatalf("could not init sqlite DB for installed integrations: %v", err)
	}

	return &Manager{
		availableIntegrationsRepo: &TestAvailableIntegrations{},
		installedIntegrationsRepo: installedIntegrationsRepo,
	}
}
