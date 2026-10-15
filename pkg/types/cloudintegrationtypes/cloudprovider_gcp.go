package cloudintegrationtypes

import (
	"bytes"
	"encoding/json"
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
	gcpBootstrapExecutorName         = "signoz-integration-bootstrap"
	gcpAPISecretID                   = "signoz-integration-api-credentials"
	gcpIngestionSecretID             = "signoz-integration-ingestion-key-credential"

	gcpCLITemplate = template.Must(template.New("gcpCLI").Funcs(template.FuncMap{
		"shellQuote": func(value string) string {
			return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
		},
	}).Parse(gcpCLITemplateStr()))
	gcpCreateServiceAccountTemplate = template.Must(gcpCLITemplate.New("gcpCreateServiceAccount").Parse(gcpCreateServiceAccountTemplateStr()))
	gcpCreateSecretsTemplate        = template.Must(gcpCLITemplate.New("gcpCreateSecrets").Parse(gcpCreateSecretsTemplateStr()))
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
	ConnectionMethod GCPConnectionMethod `json:"connectionMethod" required:"true"`
	// DeploymentProjectID is the project hosting the integration resources.
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// DeploymentRegion is the region used for the integration resources.
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// Agent setup requires exactly DeploymentProjectID; manual setup may select multiple projects.
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
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
	CLICommand                  string `json:"cliCommand" required:"true"`
	CreateSecretsCommand        string `json:"createSecretsCommand" required:"true"`
	CreateServiceAccountCommand string `json:"createServiceAccountCommand" required:"true"`
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

func (config *GCPAccountConfig) ErrIfInvalid() error {
	if config.ConnectionMethod.IsZero() {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "connectionMethod is required for GCP provider")
	}
	if config.ConnectionMethod != GCPConnectionMethodManual && config.ConnectionMethod != GCPConnectionMethodAgent {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "unsupported GCP connectionMethod: %q", config.ConnectionMethod.StringValue())
	}
	if err := validateGCPDeploymentProjectID(config.DeploymentProjectID); err != nil {
		return err
	}
	if err := validateGCPRegion(config.DeploymentRegion); err != nil {
		return err
	}
	if err := validateGCPProjectIDs(config.ProjectIDs); err != nil {
		return err
	}
	if config.ConnectionMethod == GCPConnectionMethodAgent && (len(config.ProjectIDs) != 1 || config.ProjectIDs[0] != config.DeploymentProjectID) {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds must contain only deploymentProjectId for GCP agent setup")
	}
	return nil
}

func NewGCPConnectionArtifact(accountID valuer.UUID, agentVersion string, creds *Credentials, cfg *GCPAccountConfig) (*GCPConnectionArtifact, error) {
	apiSecretJSON, err := json.Marshal(map[string]string{"api_key": creds.SigNozAPIKey})
	if err != nil {
		return nil, err
	}

	executorEmail := fmt.Sprintf("%s@%s.iam.gserviceaccount.com", gcpBootstrapExecutorName, cfg.DeploymentProjectID)
	data := gcpTemplateData{
		DeploymentName:    fmt.Sprintf("projects/%s/locations/%s/deployments/%s", cfg.DeploymentProjectID, cfg.DeploymentRegion, AgentGCPBootstrapDeploymentName),
		ProjectID:         cfg.DeploymentProjectID,
		Region:            cfg.DeploymentRegion,
		ServiceAccount:    fmt.Sprintf("projects/%s/serviceAccounts/%s", cfg.DeploymentProjectID, executorEmail),
		ExecutorName:      gcpBootstrapExecutorName,
		ExecutorEmail:     executorEmail,
		APISecretID:       gcpAPISecretID,
		IngestionSecretID: gcpIngestionSecretID,
		APISecretJSON:     string(apiSecretJSON),
		IngestionKey:      creds.IngestionKey,
		ModuleURL:         fmt.Sprintf(AgentGCPTerraformModuleStorePath, agentVersion),
		InputValues: fmt.Sprintf(
			"project_id=%s,deployment_region=%s,integration_account_id=%s,signoz_api_url=%s,ingestion_url=%s,"+
				"api_secret_id=%s,ingestion_secret_id=%s",
			cfg.DeploymentProjectID, cfg.DeploymentRegion, accountID.StringValue(), creds.SigNozAPIURL, creds.IngestionURL, gcpAPISecretID, gcpIngestionSecretID,
		),
	}

	cliCommand, err := newGCPConnectionCommand(gcpCLITemplate, data)
	if err != nil {
		return nil, err
	}
	createServiceAccountCommand, err := newGCPConnectionCommand(gcpCreateServiceAccountTemplate, data)
	if err != nil {
		return nil, err
	}
	createSecretsCommand, err := newGCPConnectionCommand(gcpCreateSecretsTemplate, data)
	if err != nil {
		return nil, err
	}

	return &GCPConnectionArtifact{
		CLICommand:                  cliCommand,
		CreateServiceAccountCommand: createServiceAccountCommand,
		CreateSecretsCommand:        createSecretsCommand,
	}, nil
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
	DeploymentName    string
	ProjectID         string
	Region            string
	ServiceAccount    string
	ExecutorName      string
	ExecutorEmail     string
	APISecretID       string
	IngestionSecretID string
	APISecretJSON     string
	IngestionKey      string
	ModuleURL         string
	InputValues       string
}

func newGCPConnectionCommand(commandTemplate *template.Template, data gcpTemplateData) (string, error) {
	var buf bytes.Buffer
	if err := commandTemplate.Execute(&buf, data); err != nil {
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
  --input-values={{.InputValues | shellQuote}},api_secret_version="${api_secret_version:-latest}",ingestion_secret_version="${ingestion_secret_version:-latest}"`
}

func gcpCreateServiceAccountTemplateStr() string {
	return `project_id={{.ProjectID | shellQuote}}
executor_email={{.ExecutorEmail | shellQuote}}
api_secret_id={{.APISecretID | shellQuote}}
ingestion_secret_id={{.IngestionSecretID | shellQuote}}
caller_email=$(gcloud config get-value account)

gcloud iam service-accounts create {{.ExecutorName | shellQuote}} \
  --project="$project_id" --display-name="SigNoz bootstrap executor"

for executor_role in \
  roles/config.agent \
  roles/serviceusage.serviceUsageAdmin \
  roles/resourcemanager.projectIamAdmin \
  roles/iam.serviceAccountAdmin \
  roles/iam.serviceAccountUser \
  roles/run.admin \
  roles/pubsub.admin \
  roles/logging.configWriter
do
  gcloud projects add-iam-policy-binding "$project_id" \
    --member="serviceAccount:${executor_email}" --role="$executor_role" \
    --condition=None
done

for secret_id in "$api_secret_id" "$ingestion_secret_id"
do
  gcloud secrets add-iam-policy-binding "$secret_id" \
    --project="$project_id" --member="serviceAccount:${executor_email}" \
    --role=roles/secretmanager.admin --condition=None
done

gcloud iam service-accounts add-iam-policy-binding "$executor_email" \
  --project="$project_id" --member="user:${caller_email}" \
  --role=roles/iam.serviceAccountUser --condition=None`
}

func gcpCreateSecretsTemplateStr() string {
	return `project_id={{.ProjectID | shellQuote}}
region={{.Region | shellQuote}}
api_secret_id={{.APISecretID | shellQuote}}
ingestion_secret_id={{.IngestionSecretID | shellQuote}}

gcloud services enable config.googleapis.com cloudbuild.googleapis.com \
  storage.googleapis.com iam.googleapis.com serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com secretmanager.googleapis.com \
  --project="$project_id" &&
sleep 60 &&

gcloud secrets create "$api_secret_id" \
  --project="$project_id" --replication-policy=user-managed \
  --locations="$region" --labels=managed-by=signoz &&

gcloud secrets create "$ingestion_secret_id" \
  --project="$project_id" --replication-policy=user-managed \
  --locations="$region" --labels=managed-by=signoz &&

api_secret_version=$(printf '%s' {{.APISecretJSON | shellQuote}} | \
  gcloud secrets versions add "$api_secret_id" \
    --project="$project_id" --data-file=- --format='value(name.basename())') &&

ingestion_secret_version=$(printf '%s' {{.IngestionKey | shellQuote}} | \
  gcloud secrets versions add "$ingestion_secret_id" \
    --project="$project_id" --data-file=- --format='value(name.basename())')`
}

func validateGCPDeploymentProjectID(projectID string) error {
	if strings.TrimSpace(projectID) == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "deploymentProjectId is required for GCP provider")
	}
	if projectID != strings.TrimSpace(projectID) {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "deploymentProjectId cannot contain leading or trailing whitespace")
	}
	return nil
}

func validateGCPProjectIDs(projectIDs []string) error {
	if len(projectIDs) == 0 {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds must contain at least one project ID for GCP provider")
	}

	for _, projectID := range projectIDs {
		if strings.TrimSpace(projectID) == "" {
			return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds cannot contain an empty or whitespace-only project ID")
		}
		if projectID != strings.TrimSpace(projectID) {
			return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds cannot contain leading or trailing whitespace")
		}
	}

	return nil
}
