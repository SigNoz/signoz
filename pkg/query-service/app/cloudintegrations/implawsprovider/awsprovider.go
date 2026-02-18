package implawsprovider

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var (
	CodeInvalidAWSRegion  = errors.MustNewCode("invalid_aws_region")
	CodeDashboardNotFound = errors.MustNewCode("dashboard_not_found")
)

type awsProvider struct {
	logger                *slog.Logger
	querier               interfaces.Querier
	accountsRepo          integrationstore.CloudProviderAccountsRepository
	serviceConfigRepo     integrationstore.ServiceConfigDatabase
	awsServiceDefinitions *services.AWSServicesProvider
	reader                interfaces.Reader
}

func NewAWSCloudProvider(
	logger *slog.Logger,
	accountsRepo integrationstore.CloudProviderAccountsRepository,
	serviceConfigRepo integrationstore.ServiceConfigDatabase,
	reader interfaces.Reader,
	querier interfaces.Querier,
) integrationtypes.CloudProvider {
	awsServiceDefinitions, err := services.NewAWSCloudProviderServices()
	if err != nil {
		panic("failed to initialize AWS service definitions: " + err.Error())
	}

	return &awsProvider{
		logger:                logger,
		reader:                reader,
		querier:               querier,
		accountsRepo:          accountsRepo,
		serviceConfigRepo:     serviceConfigRepo,
		awsServiceDefinitions: awsServiceDefinitions,
	}
}

func (a *awsProvider) GetAccountStatus(ctx context.Context, orgID, accountID string) (*integrationtypes.GettableAccountStatus, error) {
	accountRecord, err := a.accountsRepo.Get(ctx, orgID, a.GetName().String(), accountID)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAccountStatus{
		Id:             accountRecord.ID.String(),
		CloudAccountId: accountRecord.AccountID,
		Status:         accountRecord.Status(),
	}, nil
}

func (a *awsProvider) ListConnectedAccounts(ctx context.Context, orgID string) (*integrationtypes.GettableConnectedAccountsList, error) {
	accountRecords, err := a.accountsRepo.ListConnected(ctx, orgID, a.GetName().String())
	if err != nil {
		return nil, err
	}

	connectedAccounts := make([]*integrationtypes.Account, 0, len(accountRecords))
	for _, r := range accountRecords {
		connectedAccounts = append(connectedAccounts, r.Account(a.GetName()))
	}

	return &integrationtypes.GettableConnectedAccountsList{
		Accounts: connectedAccounts,
	}, nil
}

func (a *awsProvider) AgentCheckIn(ctx context.Context, req *integrationtypes.PostableAgentCheckInPayload) (any, error) {
	// agent can't check in unless the account is already created
	existingAccount, err := a.accountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.ID)
	if err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "can't check in with new %s account id %s for account %s with existing %s id %s",
			a.GetName().String(), req.AccountID, existingAccount.ID.StringValue(), a.GetName().String(),
			*existingAccount.AccountID)
	}

	existingAccount, err = a.accountsRepo.GetConnectedCloudAccount(ctx, req.OrgID, a.GetName().String(), req.AccountID)
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in to %s account %s with id %s. already connected with id %s",
			a.GetName().String(), req.AccountID, req.ID, existingAccount.ID.StringValue())
	}

	agentReport := integrationtypes.AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.ID, nil, &req.AccountID, &agentReport, nil,
	)
	if err != nil {
		return nil, err
	}

	agentConfig, err := a.getAWSAgentConfig(ctx, account)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAWSAgentCheckIn{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: *agentConfig,
	}, nil
}

func (a *awsProvider) getAWSAgentConfig(ctx context.Context, account *integrationtypes.CloudIntegration) (*integrationtypes.AWSAgentIntegrationConfig, error) {
	// prepare and return integration config to be consumed by agent
	agentConfig := &integrationtypes.AWSAgentIntegrationConfig{
		EnabledRegions: []string{},
		TelemetryCollectionStrategy: &integrationtypes.AWSCollectionStrategy{
			Metrics:   &integrationtypes.AWSMetricsStrategy{},
			Logs:      &integrationtypes.AWSLogsStrategy{},
			S3Buckets: map[string][]string{},
		},
	}

	accountConfig := new(integrationtypes.AWSAccountConfig)
	err := integrationtypes.UnmarshalJSON([]byte(account.Config), accountConfig)
	if err != nil {
		return nil, err
	}

	if accountConfig != nil && accountConfig.EnabledRegions != nil {
		agentConfig.EnabledRegions = accountConfig.EnabledRegions
	}

	svcConfigs, err := a.serviceConfigRepo.GetAllForAccount(
		ctx, account.OrgID, account.ID.StringValue(),
	)
	if err != nil {
		return nil, err
	}

	// accumulate config in a fixed order to ensure same config generated across runs
	configuredServices := maps.Keys(svcConfigs)
	slices.Sort(configuredServices)

	for _, svcType := range configuredServices {
		definition, err := a.awsServiceDefinitions.GetServiceDefinition(ctx, svcType)
		if err != nil {
			continue
		}
		config := svcConfigs[svcType]

		serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
		err = integrationtypes.UnmarshalJSON([]byte(config), serviceConfig)
		if err != nil {
			continue
		}

		if serviceConfig.Logs != nil && serviceConfig.Logs.Enabled {
			if svcType == integrationtypes.S3Sync {
				// S3 bucket sync; No cloudwatch logs are appended for this service type;
				// Though definition is populated with a custom cloudwatch group that helps in calculating logs connection status
				agentConfig.TelemetryCollectionStrategy.S3Buckets = serviceConfig.Logs.S3Buckets
			} else if definition.Strategy.Logs != nil { // services that includes a logs subscription
				agentConfig.TelemetryCollectionStrategy.Logs.Subscriptions = append(
					agentConfig.TelemetryCollectionStrategy.Logs.Subscriptions,
					definition.Strategy.Logs.Subscriptions...,
				)
			}
		}

		if serviceConfig.Metrics != nil && serviceConfig.Metrics.Enabled && definition.Strategy.Metrics != nil {
			agentConfig.TelemetryCollectionStrategy.Metrics.StreamFilters = append(
				agentConfig.TelemetryCollectionStrategy.Metrics.StreamFilters,
				definition.Strategy.Metrics.StreamFilters...,
			)
		}
	}

	return agentConfig, nil
}

func (a *awsProvider) GetName() integrationtypes.CloudProviderType {
	return integrationtypes.CloudProviderAWS
}

func (a *awsProvider) ListServices(ctx context.Context, orgID string, cloudAccountID *string) (any, error) {
	svcConfigs := make(map[string]*integrationtypes.AWSCloudServiceConfig)
	if cloudAccountID != nil {
		activeAccount, err := a.accountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), *cloudAccountID)
		if err != nil {
			return nil, err
		}

		serviceConfigs, err := a.serviceConfigRepo.GetAllForAccount(ctx, orgID, activeAccount.ID.String())
		if err != nil {
			return nil, err
		}

		for svcType, config := range serviceConfigs {
			serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
			err = integrationtypes.UnmarshalJSON([]byte(config), serviceConfig)
			if err != nil {
				return nil, err
			}
			svcConfigs[svcType] = serviceConfig
		}
	}

	summaries := make([]integrationtypes.AWSServiceSummary, 0)

	definitions, err := a.awsServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, err
	}

	for _, def := range definitions {
		summary := integrationtypes.AWSServiceSummary{
			DefinitionMetadata: def.DefinitionMetadata,
			Config:             nil,
		}

		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].DefinitionMetadata.Title < summaries[j].DefinitionMetadata.Title
	})

	return &integrationtypes.GettableAWSServices{
		Services: summaries,
	}, nil
}

func (a *awsProvider) GetServiceDetails(ctx context.Context, req *integrationtypes.GetServiceDetailsReq) (any, error) {
	details := new(integrationtypes.GettableAWSServiceDetails)

	awsDefinition, err := a.awsServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	details.AWSDefinition = *awsDefinition
	if req.CloudAccountID == nil {
		return details, nil
	}

	config, err := a.getServiceConfig(ctx, &details.AWSDefinition, req.OrgID, a.GetName().String(), req.ServiceId, *req.CloudAccountID)
	if err != nil {
		return nil, err
	}

	if config == nil {
		return details, nil
	}

	details.Config = config

	connectionStatus, err := a.calculateCloudIntegrationServiceConnectionStatus(
		ctx,
		req.OrgID,
		*req.CloudAccountID,
		&details.AWSDefinition,
	)
	if err != nil {
		return nil, err
	}

	details.ConnectionStatus = connectionStatus

	return details, nil
}

func (a *awsProvider) calculateCloudIntegrationServiceConnectionStatus(
	ctx context.Context,
	orgID valuer.UUID,
	cloudAccountId string,
	svcDetails *integrationtypes.AWSDefinition,
) (*integrationtypes.ServiceConnectionStatus, error) {
	telemetryCollectionStrategy := svcDetails.Strategy
	result := &integrationtypes.ServiceConnectionStatus{}

	if telemetryCollectionStrategy == nil {
		return result, model.InternalError(fmt.Errorf(
			"service doesn't have telemetry collection strategy: %s", svcDetails.Id,
		))
	}

	errors := make([]error, 0)
	var resultLock sync.Mutex

	var wg sync.WaitGroup

	// Calculate metrics connection status
	if telemetryCollectionStrategy.Metrics != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()

			metricsConnStatus, apiErr := a.calculateAWSIntegrationSvcMetricsConnectionStatus(
				ctx, cloudAccountId, telemetryCollectionStrategy.Metrics, svcDetails.DataCollected.Metrics,
			)

			resultLock.Lock()
			defer resultLock.Unlock()

			if apiErr != nil {
				errors = append(errors, apiErr)
			} else {
				result.Metrics = metricsConnStatus
			}
		}()
	}

	// Calculate logs connection status
	if telemetryCollectionStrategy.Logs != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()

			logsConnStatus, apiErr := a.calculateAWSIntegrationSvcLogsConnectionStatus(
				ctx, orgID, cloudAccountId, telemetryCollectionStrategy.Logs,
			)

			resultLock.Lock()
			defer resultLock.Unlock()

			if apiErr != nil {
				errors = append(errors, apiErr)
			} else {
				result.Logs = logsConnStatus
			}
		}()
	}

	wg.Wait()

	if len(errors) > 0 {
		return result, errors[0]
	}

	return result, nil

}
func (a *awsProvider) calculateAWSIntegrationSvcMetricsConnectionStatus(
	ctx context.Context,
	cloudAccountId string,
	strategy *integrationtypes.AWSMetricsStrategy,
	metricsCollectedBySvc []integrationtypes.CollectedMetric,
) (*integrationtypes.SignalConnectionStatus, *model.ApiError) {
	if strategy == nil || len(strategy.StreamFilters) < 1 {
		return nil, nil
	}

	expectedLabelValues := map[string]string{
		"cloud_provider":   "aws",
		"cloud_account_id": cloudAccountId,
	}

	metricsNamespace := strategy.StreamFilters[0].Namespace
	metricsNamespaceParts := strings.Split(metricsNamespace, "/")

	if len(metricsNamespaceParts) >= 2 {
		expectedLabelValues["service_namespace"] = metricsNamespaceParts[0]
		expectedLabelValues["service_name"] = metricsNamespaceParts[1]
	} else {
		// metrics for single word namespaces like "CWAgent" do not
		// have the service_namespace label populated
		expectedLabelValues["service_name"] = metricsNamespaceParts[0]
	}

	metricNamesCollectedBySvc := []string{}
	for _, cm := range metricsCollectedBySvc {
		metricNamesCollectedBySvc = append(metricNamesCollectedBySvc, cm.Name)
	}

	statusForLastReceivedMetric, apiErr := a.reader.GetLatestReceivedMetric(
		ctx, metricNamesCollectedBySvc, expectedLabelValues,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	if statusForLastReceivedMetric != nil {
		return &integrationtypes.SignalConnectionStatus{
			LastReceivedTsMillis: statusForLastReceivedMetric.LastReceivedTsMillis,
			LastReceivedFrom:     "signoz-aws-integration",
		}, nil
	}

	return nil, nil
}

func (a *awsProvider) calculateAWSIntegrationSvcLogsConnectionStatus(
	ctx context.Context,
	orgID valuer.UUID,
	cloudAccountId string,
	strategy *integrationtypes.AWSLogsStrategy,
) (*integrationtypes.SignalConnectionStatus, *model.ApiError) {
	if strategy == nil || len(strategy.Subscriptions) < 1 {
		return nil, nil
	}

	logGroupNamePrefix := strategy.Subscriptions[0].LogGroupNamePrefix
	if len(logGroupNamePrefix) < 1 {
		return nil, nil
	}

	logsConnTestFilter := &v3.FilterSet{
		Operator: "AND",
		Items: []v3.FilterItem{
			{
				Key: v3.AttributeKey{
					Key:      "cloud.account.id",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeResource,
				},
				Operator: "=",
				Value:    cloudAccountId,
			},
			{
				Key: v3.AttributeKey{
					Key:      "aws.cloudwatch.log_group_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeResource,
				},
				Operator: "like",
				Value:    logGroupNamePrefix + "%",
			},
		},
	}

	// TODO(Raj): Receive this as a param from UI in the future.
	lookbackSeconds := int64(30 * 60)

	qrParams := &v3.QueryRangeParamsV3{
		Start: time.Now().UnixMilli() - (lookbackSeconds * 1000),
		End:   time.Now().UnixMilli(),
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			QueryType: v3.QueryTypeBuilder,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					PageSize:          1,
					Filters:           logsConnTestFilter,
					QueryName:         "A",
					DataSource:        v3.DataSourceLogs,
					Expression:        "A",
					AggregateOperator: v3.AggregateOperatorNoOp,
				},
			},
		},
	}
	queryRes, _, err := a.querier.QueryRange(
		ctx, orgID, qrParams,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query for integration connection status: %w", err,
		))
	}
	if len(queryRes) > 0 && queryRes[0].List != nil && len(queryRes[0].List) > 0 {
		lastLog := queryRes[0].List[0]

		return &integrationtypes.SignalConnectionStatus{
			LastReceivedTsMillis: lastLog.Timestamp.UnixMilli(),
			LastReceivedFrom:     "signoz-aws-integration",
		}, nil
	}

	return nil, nil
}

func (a *awsProvider) getServiceConfig(ctx context.Context,
	def *integrationtypes.AWSDefinition, orgID valuer.UUID, cloudProvider, serviceId, cloudAccountId string,
) (*integrationtypes.AWSCloudServiceConfig, error) {
	activeAccount, err := a.accountsRepo.GetConnectedCloudAccount(ctx, orgID.String(), cloudProvider, cloudAccountId)
	if err != nil {
		return nil, err
	}

	config, err := a.serviceConfigRepo.Get(ctx, orgID.String(), activeAccount.ID.StringValue(), serviceId)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil, nil
		}

		return nil, err
	}

	serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
	err = integrationtypes.UnmarshalJSON(config, serviceConfig)
	if err != nil {
		return nil, err
	}

	if config != nil && serviceConfig.Metrics != nil && serviceConfig.Metrics.Enabled {
		def.PopulateDashboardURLs(a.GetName(), serviceId)
	}

	return serviceConfig, nil
}

func (a *awsProvider) GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	accountRecords, err := a.accountsRepo.ListConnected(ctx, orgID.StringValue(), a.GetName().String())
	if err != nil {
		return nil, err
	}

	// for now service dashboards are only available when metrics are enabled.
	servicesWithAvailableMetrics := map[string]*time.Time{}

	for _, ar := range accountRecords {
		if ar.AccountID != nil {
			configsBySvcId, err := a.serviceConfigRepo.GetAllForAccount(ctx, orgID.StringValue(), ar.ID.StringValue())
			if err != nil {
				return nil, err
			}

			for svcId, config := range configsBySvcId {
				serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
				err = integrationtypes.UnmarshalJSON(config, serviceConfig)
				if err != nil {
					return nil, err
				}

				if serviceConfig.Metrics != nil && serviceConfig.Metrics.Enabled {
					servicesWithAvailableMetrics[svcId] = &ar.CreatedAt
				}
			}
		}
	}

	svcDashboards := make([]*dashboardtypes.Dashboard, 0)

	allServices, err := a.awsServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list aws service definitions")
	}

	for _, svc := range allServices {
		serviceDashboardsCreatedAt, ok := servicesWithAvailableMetrics[svc.Id]
		if ok {
			svcDashboards = append(
				svcDashboards,
				integrationtypes.GetDashboardsFromAssets(svc.Id, a.GetName(), serviceDashboardsCreatedAt, svc.Assets)...,
			)
			servicesWithAvailableMetrics[svc.Id] = nil
		}
	}

	return svcDashboards, nil
}

func (a *awsProvider) GetDashboard(ctx context.Context, req *integrationtypes.GettableDashboard) (*dashboardtypes.Dashboard, error) {
	allDashboards, err := a.GetAvailableDashboards(ctx, req.OrgID)
	if err != nil {
		return nil, err
	}

	for _, d := range allDashboards {
		if d.ID == req.ID {
			return d, nil
		}
	}

	return nil, errors.NewNotFoundf(CodeDashboardNotFound, "dashboard with id %s not found", req.ID)
}

func (a *awsProvider) GenerateConnectionArtifact(ctx context.Context, req *integrationtypes.PostableConnectionArtifact) (any, error) {
	connection := new(integrationtypes.PostableAWSConnectionUrl)

	err := integrationtypes.UnmarshalJSON(req.Data, connection)
	if err != nil {
		return nil, err
	}

	if connection.AccountConfig != nil {
		for _, region := range connection.AccountConfig.EnabledRegions {
			if integrationtypes.ValidAWSRegions[region] {
				continue
			}

			return nil, errors.NewInvalidInputf(CodeInvalidAWSRegion, "invalid aws region: %s", region)
		}
	}

	config, err := integrationtypes.MarshalJSON(connection.AccountConfig)
	if err != nil {
		return nil, err
	}

	account, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, integrationtypes.CloudProviderAWS.String(), nil, config,
		nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	agentVersion := "v0.0.8"
	if connection.AgentConfig.Version != "" {
		agentVersion = connection.AgentConfig.Version
	}

	baseURL := fmt.Sprintf("https://%s.console.aws.amazon.com/cloudformation/home",
		connection.AgentConfig.Region)
	u, _ := url.Parse(baseURL)

	q := u.Query()
	q.Set("region", connection.AgentConfig.Region)
	u.Fragment = "/stacks/quickcreate"

	u.RawQuery = q.Encode()

	q = u.Query()
	q.Set("stackName", "signoz-integration")
	q.Set("templateURL", fmt.Sprintf("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json", agentVersion))
	q.Set("param_SigNozIntegrationAgentVersion", agentVersion)
	q.Set("param_SigNozApiUrl", connection.AgentConfig.SigNozAPIUrl)
	q.Set("param_SigNozApiKey", connection.AgentConfig.SigNozAPIKey)
	q.Set("param_SigNozAccountId", account.ID.StringValue())
	q.Set("param_IngestionUrl", connection.AgentConfig.IngestionUrl)
	q.Set("param_IngestionKey", connection.AgentConfig.IngestionKey)

	return &integrationtypes.GettableAWSConnectionUrl{
		AccountId:     account.ID.StringValue(),
		ConnectionUrl: u.String() + "?&" + q.Encode(), // this format is required by AWS
	}, nil
}

func (a *awsProvider) UpdateServiceConfig(ctx context.Context, req *integrationtypes.PatchableServiceConfig) (any, error) {
	definition, err := a.awsServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	serviceConfig := new(integrationtypes.UpdatableAWSCloudServiceConfig)
	err = integrationtypes.UnmarshalJSON(req.Config, serviceConfig)
	if err != nil {
		return nil, err
	}

	if err = serviceConfig.Config.Validate(definition); err != nil {
		return nil, err
	}

	// can only update config for a connected cloud account id
	_, err = a.accountsRepo.GetConnectedCloudAccount(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId,
	)
	if err != nil {
		return nil, err
	}

	serviceConfigBytes, err := integrationtypes.MarshalJSON(serviceConfig)
	if err != nil {
		return nil, err
	}

	updatedConfig, err := a.serviceConfigRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId, req.ServiceId, serviceConfigBytes,
	)
	if err != nil {
		return nil, err
	}

	err = integrationtypes.UnmarshalJSON(updatedConfig, serviceConfig)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.PatchServiceConfigResponse{
		ServiceId: req.ServiceId,
		Config:    serviceConfig.Config,
	}, nil
}

func (a *awsProvider) UpdateAccountConfig(ctx context.Context, req *integrationtypes.PatchableAccountConfig) (any, error) {
	config := new(integrationtypes.PatchableAWSAccountConfig)

	err := integrationtypes.UnmarshalJSON(req.Data, config)
	if err != nil {
		return nil, err
	}

	if config.Config == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "account config can't be null")
	}

	for _, region := range config.Config.EnabledRegions {
		if integrationtypes.ValidAWSRegions[region] {
			continue
		}

		return nil, errors.NewInvalidInputf(CodeInvalidAWSRegion, "invalid aws region: %s", region)
	}

	configBytes, err := integrationtypes.MarshalJSON(config.Config)
	if err != nil {
		return nil, err
	}

	// account must exist to update config, but it doesn't need to be connected
	_, err = a.accountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.AccountId)
	if err != nil {
		return nil, err
	}

	accountRecord, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.AccountId, configBytes, nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	return accountRecord.Account(a.GetName()), nil
}

func (a *awsProvider) DisconnectAccount(ctx context.Context, orgID, accountID string) (*integrationtypes.CloudIntegration, error) {
	account, err := a.accountsRepo.Get(ctx, orgID, a.GetName().String(), accountID)
	if err != nil {
		return nil, err
	}

	tsNow := time.Now()
	account, err = a.accountsRepo.Upsert(
		ctx, orgID, a.GetName().String(), &accountID, nil, nil, nil, &tsNow,
	)
	if err != nil {
		return nil, err
	}

	return account, nil
}
