package telemetry

import (
	"context"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"go.uber.org/zap"
)

func getChannels(ctx context.Context, sqlstore sqlstore.SQLStore) ([]*alertmanagertypes.Channel, error) {
	channels := []*alertmanagertypes.Channel{}
	if err := sqlstore.BunDB().NewSelect().Model(&channels).Scan(ctx); err != nil {
		return nil, err
	}

	return channels, nil
}

func GetAlertsInfo(ctx context.Context, sqlstore sqlstore.SQLStore) (*model.AlertsInfo, error) {
	alertsInfo := model.AlertsInfo{}

	var alertsData []string
	var alertNames []string
	err := sqlstore.BunDB().NewSelect().Model((*ruletypes.Rule)(nil)).Column("data").Scan(ctx, &alertsData)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return &alertsInfo, err
	}
	for _, alert := range alertsData {
		var rule ruletypes.GettableRule
		if strings.Contains(alert, "time_series_v2") {
			alertsInfo.AlertsWithTSV2 = alertsInfo.AlertsWithTSV2 + 1
		}
		err = json.Unmarshal([]byte(alert), &rule)
		if err != nil {
			zap.L().Error("invalid rule data", zap.Error(err))
			continue
		}
		alertNames = append(alertNames, rule.AlertName)
		if rule.AlertType == ruletypes.AlertTypeLogs {
			alertsInfo.LogsBasedAlerts = alertsInfo.LogsBasedAlerts + 1

			if rule.RuleCondition != nil && rule.RuleCondition.CompositeQuery != nil {
				if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
					if strings.Contains(alert, "signoz_logs.distributed_logs") ||
						strings.Contains(alert, "signoz_logs.logs") {
						alertsInfo.AlertsWithLogsChQuery = alertsInfo.AlertsWithLogsChQuery + 1
					}
				}
			}

			for _, query := range rule.RuleCondition.CompositeQuery.BuilderQueries {
				if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder {
					if query.Filters != nil {
						for _, item := range query.Filters.Items {
							if slices.Contains([]string{"contains", "ncontains", "like", "nlike"}, string(item.Operator)) {
								if item.Key.Key != "body" {
									alertsInfo.AlertsWithLogsContainsOp += 1
								}
							}
						}
					}
				}
			}
		} else if rule.AlertType == ruletypes.AlertTypeMetric {
			alertsInfo.MetricBasedAlerts = alertsInfo.MetricBasedAlerts + 1
			if rule.RuleCondition != nil && rule.RuleCondition.CompositeQuery != nil {
				if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder {
					alertsInfo.MetricsBuilderQueries = alertsInfo.MetricsBuilderQueries + 1
				} else if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
					alertsInfo.MetricsClickHouseQueries = alertsInfo.MetricsClickHouseQueries + 1
				} else if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
					alertsInfo.MetricsPrometheusQueries = alertsInfo.MetricsPrometheusQueries + 1
					for _, query := range rule.RuleCondition.CompositeQuery.PromQueries {
						if strings.Contains(query.Query, "signoz_") {
							alertsInfo.SpanMetricsPrometheusQueries = alertsInfo.SpanMetricsPrometheusQueries + 1
						}
					}
				}
			}
			if rule.RuleType == ruletypes.RuleTypeAnomaly {
				alertsInfo.AnomalyBasedAlerts = alertsInfo.AnomalyBasedAlerts + 1
			}
		} else if rule.AlertType == ruletypes.AlertTypeTraces {
			alertsInfo.TracesBasedAlerts = alertsInfo.TracesBasedAlerts + 1

			if rule.RuleCondition != nil && rule.RuleCondition.CompositeQuery != nil {
				if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
					if strings.Contains(alert, "signoz_traces.distributed_signoz_index_v2") ||
						strings.Contains(alert, "signoz_traces.distributed_signoz_spans") ||
						strings.Contains(alert, "signoz_traces.distributed_signoz_error_index_v2") {
						alertsInfo.AlertsWithTraceChQuery = alertsInfo.AlertsWithTraceChQuery + 1
					}
				}
			}
		}
		alertsInfo.TotalAlerts = alertsInfo.TotalAlerts + 1
		if !rule.PostableRule.Disabled {
			alertsInfo.TotalActiveAlerts = alertsInfo.TotalActiveAlerts + 1
		}
	}
	alertsInfo.AlertNames = alertNames

	channels, err := getChannels(ctx, sqlstore)
	if err != nil {
		return &alertsInfo, err
	}
	if channels != nil {
		alertsInfo.TotalChannels = len(channels)
		for _, channel := range channels {
			if channel.Type == "slack" {
				alertsInfo.SlackChannels = alertsInfo.SlackChannels + 1
			}
			if channel.Type == "webhook" {
				alertsInfo.WebHookChannels = alertsInfo.WebHookChannels + 1
			}
			if channel.Type == "email" {
				alertsInfo.EmailChannels = alertsInfo.EmailChannels + 1
			}
			if channel.Type == "pagerduty" {
				alertsInfo.PagerDutyChannels = alertsInfo.PagerDutyChannels + 1
			}
			if channel.Type == "opsgenie" {
				alertsInfo.OpsGenieChannels = alertsInfo.OpsGenieChannels + 1
			}
			if channel.Type == "msteams" {
				alertsInfo.MSTeamsChannels = alertsInfo.MSTeamsChannels + 1
			}
		}
	}

	return &alertsInfo, nil
}
