package cloudintegrationtypes

import (
	"bytes"
	"fmt"
	"slices"
	"strings"
	"text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	GCPConnectionMethodManual = GCPConnectionMethod{valuer.NewString("manual")}
	GCPConnectionMethodAgent  = GCPConnectionMethod{valuer.NewString("agent")}

	// TODO: Confirm the published bootstrap module location before release.
	AgentGCPTerraformModuleStorePath = "gs://signoz-cloud-integration/gcp/%s/bootstrap/"
	AgentGCPBootstrapDeploymentName  = "signoz-integration-bootstrap"

	gcpCLITemplate = template.Must(template.New("gcpCLI").Funcs(template.FuncMap{
		"shellQuote": func(value string) string {
			return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
		},
	}).Parse(gcpCLITemplateStr()))
)

type GCPConnectionMethod struct{ valuer.String }

func (GCPConnectionMethod) Enum() []any {
	return []any{GCPConnectionMethodManual, GCPConnectionMethodAgent}
}

type GCPAccountConfig struct {
	ConnectionMethod GCPConnectionMethod `json:"connectionMethod" required:"true"`
	// DeploymentProjectID is the project hosting the integration resources.
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// DeploymentRegion is the region used for the integration resources.
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// Agent accounts store exactly the deployment project; manual accounts may monitor multiple projects.
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
}

type GCPPostableAccountConfig struct {
	// ConnectionMethod defaults to manual when omitted.
	ConnectionMethod GCPConnectionMethod `json:"connectionMethod,omitempty" required:"false" default:"manual"`
	// DeploymentProjectID is the project hosting the integration resources.
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// DeploymentRegion is the region used for the integration resources.
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// Required for manual setup; always replaced with DeploymentProjectID for Agent setup.
	ProjectIDs []string `json:"projectIds,omitempty" required:"false" nullable:"false"`
}

// UpdatableGCPAccountConfig contains settings for manual integrations only.
type UpdatableGCPAccountConfig struct {
	// DeploymentProjectID is the project hosting the manually configured integration resources.
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// DeploymentRegion is the region used for the manually configured integration resources.
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// ProjectIDs lists the projects monitored by the manual integration.
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
}

type GCPConnectionArtifact struct {
	CLICommand string `json:"cliCommand" required:"true"`
}

type GCPIntegrationConfig struct {
	GCPAccountConfig
	TelemetryCollectionStrategy *GCPTelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

type GCPTelemetryCollectionStrategy struct {
	Metrics *GCPMetricsCollectionStrategy `json:"metrics,omitempty" required:"false" nullable:"false"`
	Logs    *GCPLogsCollectionStrategy    `json:"logs,omitempty" required:"false" nullable:"false"`
}

type GCPMetricsCollectionStrategy struct {
	MetricNames []string `json:"metricNames" required:"true" nullable:"false"`
}

type GCPLogsCollectionStrategy struct {
	SinkFilter string `json:"sinkFilter" required:"true"`
}

type GCPServiceConfig struct {
	Logs    *GCPServiceLogsConfig    `json:"logs,omitempty" required:"false"`
	Metrics *GCPServiceMetricsConfig `json:"metrics,omitempty" required:"false"`
}

type GCPServiceLogsConfig struct {
	Enabled bool `json:"enabled" required:"true"`
}

type GCPServiceMetricsConfig struct {
	Enabled bool `json:"enabled" required:"true"`
}

func NewGCPConnectionArtifact(accountID valuer.UUID, agentVersion string, creds *Credentials, cfg *GCPAccountConfig) (*GCPConnectionArtifact, error) {
	data := gcpTemplateData{
		DeploymentName: fmt.Sprintf("projects/%s/locations/%s/deployments/%s", cfg.DeploymentProjectID, cfg.DeploymentRegion, AgentGCPBootstrapDeploymentName),
		ProjectID:      cfg.DeploymentProjectID,
		ServiceAccount: fmt.Sprintf("projects/%s/serviceAccounts/signoz-integration-bootstrap@%s.iam.gserviceaccount.com", cfg.DeploymentProjectID, cfg.DeploymentProjectID),
		ModuleURL:      fmt.Sprintf(AgentGCPTerraformModuleStorePath, agentVersion),
		InputValues: fmt.Sprintf(
			"project_id=%s,deployment_region=%s,integration_account_id=%s,signoz_api_url=%s,ingestion_url=%s,"+
				"api_key_secret_id=signoz-integration-credentials-api-key,"+
				"ingestion_key_secret_id=signoz-integration-credentials-ingestion-key",
			cfg.DeploymentProjectID, cfg.DeploymentRegion, accountID.StringValue(), creds.SigNozAPIURL, creds.IngestionURL,
		),
	}

	cliCommand, err := newGCPConnectionCLICommand(data)
	if err != nil {
		return nil, err
	}

	return &GCPConnectionArtifact{CLICommand: cliCommand}, nil
}

// NewGCPIntegrationConfig sorts and deduplicates the input slices in place and formats sink filters for joining with OR.
func NewGCPIntegrationConfig(config *GCPAccountConfig, metricNames, sinkFilters []string) *GCPIntegrationConfig {
	// Parentheses preserve each service filter's meaning when combined with OR.
	for i, filter := range sinkFilters {
		sinkFilters[i] = "(" + strings.TrimSpace(filter) + ")"
	}

	// Keep the generated config stable and avoid collecting shared metrics more than once.
	slices.Sort(metricNames)
	metricNames = slices.Compact(metricNames)
	slices.Sort(sinkFilters)
	sinkFilters = slices.Compact(sinkFilters)

	strategy := new(GCPTelemetryCollectionStrategy)
	if len(metricNames) > 0 {
		strategy.Metrics = &GCPMetricsCollectionStrategy{MetricNames: metricNames}
	}
	if len(sinkFilters) > 0 {
		strategy.Logs = &GCPLogsCollectionStrategy{SinkFilter: strings.Join(sinkFilters, " OR ")}
	}

	return &GCPIntegrationConfig{
		GCPAccountConfig:            *config,
		TelemetryCollectionStrategy: strategy,
	}
}

type gcpTemplateData struct {
	DeploymentName string
	ProjectID      string
	ServiceAccount string
	ModuleURL      string
	InputValues    string
}

func newGCPConnectionCLICommand(data gcpTemplateData) (string, error) {
	var buf bytes.Buffer
	if err := gcpCLITemplate.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func gcpCLITemplateStr() string {
	return `gcloud infra-manager deployments apply \
  {{.DeploymentName | shellQuote}} \
  --project={{.ProjectID | shellQuote}} \
  --service-account={{.ServiceAccount | shellQuote}} \
  --gcs-source={{.ModuleURL | shellQuote}} \
  --tf-version-constraint='=1.5.7' \
  --input-values={{.InputValues | shellQuote}},api_key_secret_version="${api_key_version:-latest}",ingestion_key_secret_version="${ingestion_key_version:-latest}"`
}

func normalizeGCPProjectIDs(projectIDs []string) ([]string, error) {
	if len(projectIDs) == 0 {
		return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one project id is required for GCP provider")
	}

	normalized := make([]string, len(projectIDs))
	for i, projectID := range projectIDs {
		projectID = strings.TrimSpace(projectID)
		if projectID == "" {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds cannot contain an empty or whitespace-only project ID")
		}
		normalized[i] = projectID
	}

	return normalized, nil
}
