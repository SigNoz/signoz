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

type BaseCloudProvider[T integrationtypes.Definition] struct {
	Logger             *slog.Logger
	Querier            querier.Querier
	AccountsRepo       store.CloudProviderAccountsRepository
	ServiceConfigRepo  store.ServiceConfigDatabase
	ServiceDefinitions *services.ServicesProvider[T]
	ProviderType       integrationtypes.CloudProviderType
}

func (b *BaseCloudProvider[T]) GetName() integrationtypes.CloudProviderType {
	return b.ProviderType
}

func (b *BaseCloudProvider[T]) GetAccountStatus(ctx context.Context, orgID, accountID string) (*integrationtypes.GettableAccountStatus, error) {
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

func (b *BaseCloudProvider[T]) ListConnectedAccounts(ctx context.Context, orgID string) (*integrationtypes.GettableConnectedAccountsList, error) {
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

func (b *BaseCloudProvider[T]) DisconnectAccount(ctx context.Context, orgID, accountID string) (*integrationtypes.CloudIntegration, error) {
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

func (b *BaseCloudProvider[T]) GetDashboard(ctx context.Context, req *integrationtypes.GettableDashboard, getAvailableDashboards func(context.Context, valuer.UUID) ([]*dashboardtypes.Dashboard, error)) (*dashboardtypes.Dashboard, error) {
	allDashboards, err := getAvailableDashboards(ctx, req.OrgID)
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

func (b *BaseCloudProvider[T]) GetServiceConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	def T,
	isMetricsEnabled bool,
	isLogsEnabled bool,
) (*integrationtypes.ServiceConnectionStatus, error) {
	ingestionStatusCheck := def.GetIngestionStatusCheck()
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
					"service", def.GetId(),
					"error", err,
					"stack", string(stack),
				)
			})
			defer wg.Done()
			status, _ := b.getServiceMetricsConnectionStatus(ctx, cloudAccountID, orgID, def)
			resp.Metrics = status
		}()
	}

	if len(ingestionStatusCheck.Logs) > 0 && isLogsEnabled {
		wg.Add(1)
		go func() {
			defer utils.RecoverPanic(func(err interface{}, stack []byte) {
				b.Logger.ErrorContext(
					ctx, "panic while getting service logs connection status",
					"service", def.GetId(),
					"error", err,
					"stack", string(stack),
				)
			})
			defer wg.Done()
			status, _ := b.getServiceLogsConnectionStatus(ctx, cloudAccountID, orgID, def)
			resp.Logs = status
		}()
	}

	wg.Wait()

	return resp, nil
}

func (b *BaseCloudProvider[T]) getServiceMetricsConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	def T,
) ([]*integrationtypes.SignalConnectionStatus, error) {
	ingestionStatusCheck := def.GetIngestionStatusCheck()
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
				"service", def.GetId(),
			)
			continue
		}

		if resp != nil && len(resp.Data.Results) < 1 {
			continue
		}

		queryResponse, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		if !ok {
			b.Logger.ErrorContext(ctx, "unexpected query response type for service metrics connection status",
				"service", def.GetId(),
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

func (b *BaseCloudProvider[T]) getServiceLogsConnectionStatus(
	ctx context.Context,
	cloudAccountID string,
	orgID valuer.UUID,
	def T,
) ([]*integrationtypes.SignalConnectionStatus, error) {
	ingestionStatusCheck := def.GetIngestionStatusCheck()
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
				"service", def.GetId(),
			)
			continue
		}

		if resp != nil && len(resp.Data.Results) < 1 {
			continue
		}

		queryResponse, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		if !ok {
			b.Logger.ErrorContext(ctx, "unexpected query response type for service logs connection status",
				"service", def.GetId(),
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

func GetAvailableDashboards[T integrationtypes.Definition, C any](
	ctx context.Context,
	b *BaseCloudProvider[T],
	orgID valuer.UUID,
	isMetricsEnabled func(C) bool,
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
				var serviceConfig C
				err = integrationtypes.UnmarshalJSON(config, &serviceConfig)
				if err != nil {
					return nil, err
				}

				if isMetricsEnabled(serviceConfig) {
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
