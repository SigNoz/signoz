package baseprovider

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	CodeDashboardNotFound = errors.MustNewCode("dashboard_not_found")
)

// hasValidTimeSeriesData checks if a query response contains valid time series data
// with at least one aggregation, series, and value
func hasValidTimeSeriesData(queryResponse *qbtypes.TimeSeriesData) bool {
	return queryResponse != nil &&
		len(queryResponse.Aggregations) > 0 &&
		len(queryResponse.Aggregations[0].Series) > 0 &&
		len(queryResponse.Aggregations[0].Series[0].Values) > 0
}

type BaseCloudProvider[def integrationtypes.Definition, conf integrationtypes.CloudServiceConfig[def]] struct {
	Logger             *slog.Logger
	Querier            querier.Querier
	AccountsRepo       store.CloudProviderAccountsRepository
	ServiceConfigRepo  store.ServiceConfigDatabase
	ServiceDefinitions *services.ServicesProvider[def]
	ProviderType       integrationtypes.CloudProviderType
}

func (b *BaseCloudProvider[def, conf]) GetName() integrationtypes.CloudProviderType {
	return b.ProviderType
}

// AgentCheckIn is a helper function that handles common agent check-in logic.
// The getAgentConfigFunc should return the provider-specific agent configuration.
func AgentCheckIn[def integrationtypes.Definition, conf integrationtypes.CloudServiceConfig[def], AgentConfigT any](
	b *BaseCloudProvider[def, conf],
	ctx context.Context,
	req *integrationtypes.PostableAgentCheckInPayload,
	getAgentConfigFunc func(context.Context, *integrationtypes.CloudIntegration) (*AgentConfigT, error),
) (*integrationtypes.GettableAgentCheckIn[AgentConfigT], error) {
	// agent can't check in unless the account is already created
	existingAccount, err := b.AccountsRepo.Get(ctx, req.OrgID, b.GetName().String(), req.ID)
	if err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in with new %s account id %s for account %s with existing %s id %s",
			b.GetName().String(), req.AccountID, existingAccount.ID.StringValue(), b.GetName().String(),
			*existingAccount.AccountID,
		)
	}

	existingAccount, err = b.AccountsRepo.GetConnectedCloudAccount(ctx, req.OrgID, b.GetName().String(), req.AccountID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in to %s account %s with id %s. already connected with id %s",
			b.GetName().String(), req.AccountID, req.ID, existingAccount.ID.StringValue(),
		)
	}

	agentReport := integrationtypes.AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, err := b.AccountsRepo.Upsert(
		ctx, req.OrgID, b.GetName().String(), &req.ID, nil, &req.AccountID, &agentReport, nil,
	)
	if err != nil {
		return nil, err
	}

	agentConfig, err := getAgentConfigFunc(ctx, account)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAgentCheckIn[AgentConfigT]{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: *agentConfig,
	}, nil
}

func (b *BaseCloudProvider[def, conf]) GetAccountStatus(ctx context.Context, orgID, accountID string) (*integrationtypes.GettableAccountStatus, error) {
	accountRecord, err := b.AccountsRepo.Get(ctx, orgID, b.ProviderType.String(), accountID)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAccountStatus{
		Id:             accountRecord.ID.String(),
		CloudAccountId: accountRecord.AccountID,
		Status:         accountRecord.Status(),
	}, nil
}

func (b *BaseCloudProvider[def, conf]) ListConnectedAccounts(ctx context.Context, orgID string) (*integrationtypes.GettableConnectedAccountsList, error) {
	accountRecords, err := b.AccountsRepo.ListConnected(ctx, orgID, b.ProviderType.String())
	if err != nil {
		return nil, err
	}

	connectedAccounts := make([]*integrationtypes.Account, 0, len(accountRecords))
	for _, r := range accountRecords {
		connectedAccounts = append(connectedAccounts, r.Account(b.ProviderType))
	}

	return &integrationtypes.GettableConnectedAccountsList{
		Accounts: connectedAccounts,
	}, nil
}

func (b *BaseCloudProvider[def, conf]) DisconnectAccount(ctx context.Context, orgID, accountID string) (*integrationtypes.CloudIntegration, error) {
	account, err := b.AccountsRepo.Get(ctx, orgID, b.ProviderType.String(), accountID)
	if err != nil {
		return nil, err
	}

	tsNow := time.Now()
	account, err = b.AccountsRepo.Upsert(
		ctx, orgID, b.ProviderType.String(), &accountID, nil, nil, nil, &tsNow,
	)
	if err != nil {
		return nil, err
	}

	return account, nil
}

func (b *BaseCloudProvider[def, conf]) GetDashboard(ctx context.Context, req *integrationtypes.GettableDashboard) (*dashboardtypes.Dashboard, error) {
	allDashboards, err := b.GetAvailableDashboards(ctx, req.OrgID)
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

func (b *BaseCloudProvider[def, conf]) GetServiceConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	definition def,
	isMetricsEnabled bool,
	isLogsEnabled bool,
) (*integrationtypes.ServiceConnectionStatus, error) {
	ingestionStatusCheck := definition.GetIngestionStatusCheck()
	if ingestionStatusCheck == nil {
		return nil, nil
	}

	resp := new(integrationtypes.ServiceConnectionStatus)

	wg := sync.WaitGroup{}

	if len(ingestionStatusCheck.Metrics) > 0 && isMetricsEnabled {
		wg.Add(1)
		go func() {
			defer utils.RecoverPanic(func(err interface{}, stack []byte) {
				b.Logger.ErrorContext(
					ctx, "panic while getting service metrics connection status",
					"service", definition.GetId(),
					"error", err,
					"stack", string(stack),
				)
			})
			defer wg.Done()
			status, _ := b.getServiceMetricsConnectionStatus(ctx, cloudAccountID, orgID, definition)
			resp.Metrics = status
		}()
	}

	if len(ingestionStatusCheck.Logs) > 0 && isLogsEnabled {
		wg.Add(1)
		go func() {
			defer utils.RecoverPanic(func(err interface{}, stack []byte) {
				b.Logger.ErrorContext(
					ctx, "panic while getting service logs connection status",
					"service", definition.GetId(),
					"error", err,
					"stack", string(stack),
				)
			})
			defer wg.Done()
			status, _ := b.getServiceLogsConnectionStatus(ctx, cloudAccountID, orgID, definition)
			resp.Logs = status
		}()
	}

	wg.Wait()

	return resp, nil
}

func (b *BaseCloudProvider[def, conf]) getServiceMetricsConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	definition def,
) ([]*integrationtypes.SignalConnectionStatus, error) {
	ingestionStatusCheck := definition.GetIngestionStatusCheck()
	if ingestionStatusCheck == nil || len(ingestionStatusCheck.Metrics) < 1 {
		return nil, nil
	}

	statusResp := make([]*integrationtypes.SignalConnectionStatus, 0)

	for _, metric := range ingestionStatusCheck.Metrics {
		statusResp = append(statusResp, &integrationtypes.SignalConnectionStatus{
			CategoryID:          metric.Category,
			CategoryDisplayName: metric.DisplayName,
		})
	}

	for index, category := range ingestionStatusCheck.Metrics {
		queries := make([]qbtypes.QueryEnvelope, 0)

		for _, check := range category.Checks {
			// TODO: make sure all the cloud providers send these two attributes
			// or create map of provider specific filter expression
			filterExpression := fmt.Sprintf(`cloud.provider="%s" AND cloud.account.id="%s"`, b.ProviderType.String(), cloudAccountID)
			f := ""
			for _, attribute := range check.Attributes {
				f = fmt.Sprintf("%s %s", attribute.Name, attribute.Operator)
				if attribute.Value != "" {
					f = fmt.Sprintf("%s '%s'", f, attribute.Value)
				}

				filterExpression = fmt.Sprintf("%s AND %s", filterExpression, f)
			}

			queries = append(queries, qbtypes.QueryEnvelope{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Name:   valuer.GenerateUUID().String(),
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       check.Key,
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
					}},
					Filter: &qbtypes.Filter{
						Expression: filterExpression,
					},
				},
			})
		}

		resp, err := b.Querier.QueryRange(ctx, orgID, &qbtypes.QueryRangeRequest{
			SchemaVersion: "v5",
			Start:         uint64(time.Now().Add(-time.Hour).UnixMilli()),
			End:           uint64(time.Now().UnixMilli()),
			RequestType:   qbtypes.RequestTypeScalar,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: queries,
			},
		})
		if err != nil {
			b.Logger.DebugContext(ctx,
				"error querying for service metrics connection status",
				"error", err,
				"service", definition.GetId(),
			)
			continue
		}

		if resp != nil && len(resp.Data.Results) < 1 {
			continue
		}

		queryResponse, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		if !ok {
			b.Logger.ErrorContext(ctx, "unexpected query response type for service metrics connection status",
				"service", definition.GetId(),
			)
			continue
		}

		if !hasValidTimeSeriesData(queryResponse) {
			continue
		}

		statusResp[index] = &integrationtypes.SignalConnectionStatus{
			CategoryID:           category.Category,
			CategoryDisplayName:  category.DisplayName,
			LastReceivedTsMillis: queryResponse.Aggregations[0].Series[0].Values[0].Timestamp,
			LastReceivedFrom:     fmt.Sprintf("signoz-%s-integration", b.ProviderType.String()),
		}
	}

	return statusResp, nil
}

func (b *BaseCloudProvider[def, conf]) getServiceLogsConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	definition def,
) ([]*integrationtypes.SignalConnectionStatus, error) {
	ingestionStatusCheck := definition.GetIngestionStatusCheck()
	if ingestionStatusCheck == nil || len(ingestionStatusCheck.Logs) < 1 {
		return nil, nil
	}

	statusResp := make([]*integrationtypes.SignalConnectionStatus, 0)

	for _, log := range ingestionStatusCheck.Logs {
		statusResp = append(statusResp, &integrationtypes.SignalConnectionStatus{
			CategoryID:          log.Category,
			CategoryDisplayName: log.DisplayName,
		})
	}

	for index, category := range ingestionStatusCheck.Logs {
		queries := make([]qbtypes.QueryEnvelope, 0)

		for _, check := range category.Checks {
			// TODO: make sure all the cloud providers send these two attributes
			// or create map of provider specific filter expression
			filterExpression := fmt.Sprintf(`cloud.account.id="%s"`, cloudAccountID)
			f := ""
			for _, attribute := range check.Attributes {
				f = fmt.Sprintf("%s %s", attribute.Name, attribute.Operator)
				if attribute.Value != "" {
					f = fmt.Sprintf("%s '%s'", f, attribute.Value)
				}

				filterExpression = fmt.Sprintf("%s AND %s", filterExpression, f)
			}

			queries = append(queries, qbtypes.QueryEnvelope{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
					Name:   valuer.GenerateUUID().String(),
					Signal: telemetrytypes.SignalLogs,
					Aggregations: []qbtypes.LogAggregation{{
						Expression: "count()",
					}},
					Filter: &qbtypes.Filter{
						Expression: filterExpression,
					},
					Limit:  10,
					Offset: 0,
				},
			})
		}

		resp, err := b.Querier.QueryRange(ctx, orgID, &qbtypes.QueryRangeRequest{
			SchemaVersion: "v1",
			Start:         uint64(time.Now().Add(-time.Hour * 1).UnixMilli()),
			End:           uint64(time.Now().UnixMilli()),
			RequestType:   qbtypes.RequestTypeTimeSeries,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: queries,
			},
		})
		if err != nil {
			b.Logger.DebugContext(ctx,
				"error querying for service logs connection status",
				"error", err,
				"service", definition.GetId(),
			)
			continue
		}

		if resp != nil && len(resp.Data.Results) < 1 {
			continue
		}

		queryResponse, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		if !ok {
			b.Logger.ErrorContext(ctx, "unexpected query response type for service logs connection status",
				"service", definition.GetId(),
			)
			continue
		}

		if !hasValidTimeSeriesData(queryResponse) {
			continue
		}

		statusResp[index] = &integrationtypes.SignalConnectionStatus{
			CategoryID:           category.Category,
			CategoryDisplayName:  category.DisplayName,
			LastReceivedTsMillis: queryResponse.Aggregations[0].Series[0].Values[0].Timestamp,
			LastReceivedFrom:     fmt.Sprintf("signoz-%s-integration", b.ProviderType.String()),
		}
	}

	return statusResp, nil
}

func (b *BaseCloudProvider[def, conf]) GetAvailableDashboards(
	ctx context.Context,
	orgID valuer.UUID,
) ([]*dashboardtypes.Dashboard, error) {
	accountRecords, err := b.AccountsRepo.ListConnected(ctx, orgID.StringValue(), b.ProviderType.String())
	if err != nil {
		return nil, err
	}

	servicesWithAvailableMetrics := map[string]*time.Time{}

	for _, ar := range accountRecords {
		if ar.AccountID != nil {
			configsBySvcId, err := b.ServiceConfigRepo.GetAllForAccount(ctx, orgID.StringValue(), ar.ID.StringValue())
			if err != nil {
				return nil, err
			}

			for svcId, config := range configsBySvcId {
				var serviceConfig conf
				err = integrationtypes.UnmarshalJSON(config, &serviceConfig)
				if err != nil {
					return nil, err
				}

				if serviceConfig.IsMetricsEnabled() {
					servicesWithAvailableMetrics[svcId] = &ar.CreatedAt
				}
			}
		}
	}

	svcDashboards := make([]*dashboardtypes.Dashboard, 0)

	allServices, err := b.ServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list %s service definitions", b.ProviderType.String())
	}

	// accumulate definitions in a fixed order to ensure same order of dashboards across runs
	svcIds := make([]string, 0, len(allServices))
	for id := range allServices {
		svcIds = append(svcIds, id)
	}
	sort.Strings(svcIds)

	for _, svcId := range svcIds {
		svc := allServices[svcId]
		serviceDashboardsCreatedAt, ok := servicesWithAvailableMetrics[svcId]
		if ok && serviceDashboardsCreatedAt != nil {
			svcDashboards = append(
				svcDashboards,
				integrationtypes.GetDashboardsFromAssets(svc.GetId(), orgID, b.ProviderType, serviceDashboardsCreatedAt, svc.GetAssets())...,
			)
			servicesWithAvailableMetrics[svcId] = nil
		}
	}

	return svcDashboards, nil
}

func (b *BaseCloudProvider[def, conf]) GetServiceConfig(
	ctx context.Context,
	definition def,
	orgID valuer.UUID,
	serviceId,
	cloudAccountId string,
) (conf, error) {
	var zero conf

	activeAccount, err := b.AccountsRepo.GetConnectedCloudAccount(ctx, orgID.String(), b.ProviderType.String(), cloudAccountId)
	if err != nil {
		return zero, err
	}

	config, err := b.ServiceConfigRepo.Get(ctx, orgID.String(), activeAccount.ID.StringValue(), serviceId)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return zero, nil
		}

		return zero, err
	}

	var serviceConfig conf
	err = integrationtypes.UnmarshalJSON(config, &serviceConfig)
	if err != nil {
		return zero, err
	}

	if config != nil && serviceConfig.IsMetricsEnabled() {
		definition.PopulateDashboardURLs(b.ProviderType, serviceId)
	}

	return serviceConfig, nil
}

func (b *BaseCloudProvider[def, conf]) UpdateServiceConfig(ctx context.Context, req *integrationtypes.UpdatableServiceConfigReq) (any, error) {
	definition, err := b.ServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	var updateReq integrationtypes.UpdatableCloudServiceConfig[conf]
	err = integrationtypes.UnmarshalJSON(req.Config, &updateReq)
	if err != nil {
		return nil, err
	}

	// Check if config is provided (use any type assertion for nil check with generics)
	if any(updateReq.Config) == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "config is required")
	}

	if err = updateReq.Config.Validate(definition); err != nil {
		return nil, err
	}

	// can only update config for a connected cloud account id
	_, err = b.AccountsRepo.GetConnectedCloudAccount(
		ctx, req.OrgID, b.GetName().String(), updateReq.CloudAccountId,
	)
	if err != nil {
		return nil, err
	}

	serviceConfigBytes, err := integrationtypes.MarshalJSON(&updateReq.Config)
	if err != nil {
		return nil, err
	}

	updatedConfigBytes, err := b.ServiceConfigRepo.Upsert(
		ctx, req.OrgID, b.GetName().String(), updateReq.CloudAccountId, req.ServiceId, serviceConfigBytes,
	)
	if err != nil {
		return nil, err
	}

	var updatedConfig conf
	err = integrationtypes.UnmarshalJSON(updatedConfigBytes, &updatedConfig)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.PatchServiceConfigResponse{
		ServiceId: req.ServiceId,
		Config:    updatedConfig,
	}, nil
}
