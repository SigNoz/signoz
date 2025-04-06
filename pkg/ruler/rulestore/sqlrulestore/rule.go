package sqlrulestore

import (
	"context"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type rule struct {
	*sqlx.DB
	sqlstore sqlstore.SQLStore
}

func NewRuleStore(db *sqlx.DB, store sqlstore.SQLStore) ruletypes.RuleStore {
	return &rule{sqlstore: store, DB: db}
}

// CreateRule stores a given rule in db and returns task name and error (if any)
func (r *rule) CreateRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storedRule).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx, storedRule.ID)
	})

	if err != nil {
		return valuer.UUID{}, err
	}

	return storedRule.ID, nil
}

// EditRule stores a given rule string in database and returns task name and error (if any)
func (r *rule) EditRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context) error) error {
	return r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storedRule).
			Where("id = ?", storedRule.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	})
}

// DeleteRule deletes a given rule with id and returns taskname and error (if any)
func (r *rule) DeleteRule(ctx context.Context, id valuer.UUID, cb func(context.Context) error) error {
	if err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(ruletypes.Rule)).
			Where("id = ?", id.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	}); err != nil {
		return err
	}

	return nil
}

func (r *rule) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	rules := make([]*ruletypes.Rule, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return rules, err
	}

	return rules, nil
}

func (r *rule) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	rule := new(ruletypes.Rule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(rule).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}
	return rule, nil
}

func (r *rule) ListOrgs(ctx context.Context) ([]string, error) {
	orgIDs := []string{}
	err := r.sqlstore.
		BunDB().
		NewSelect().
		ColumnExpr("id").
		Model(new(types.Organization)).
		Scan(ctx, &orgIDs)
	if err != nil {
		return orgIDs, err
	}

	return orgIDs, nil
}

func (r *rule) getChannels() (*[]model.ChannelItem, *model.ApiError) {
	channels := []model.ChannelItem{}

	query := "SELECT id, created_at, updated_at, name, type, data data FROM notification_channels"

	err := r.Select(&channels, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &channels, nil
}

func (r *rule) GetAlertsInfo(ctx context.Context) (*model.AlertsInfo, error) {
	alertsInfo := model.AlertsInfo{}
	// fetch alerts from rules db
	query := "SELECT data FROM rules"
	var alertsData []string
	var alertNames []string
	err := r.Select(&alertsData, query)
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

	channels, _ := r.getChannels()
	if channels != nil {
		alertsInfo.TotalChannels = len(*channels)
		for _, channel := range *channels {
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
