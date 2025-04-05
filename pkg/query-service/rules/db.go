package rules

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/rulertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.uber.org/zap"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRule stores rule in the db and returns tx and group name (on success)
	CreateRule(context.Context, *ruletypes.Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRule(context.Context, *ruletypes.Rule, func(context.Context) error) error

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error

	// GetStoredRules fetches the rule definitions from db
	GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error)

	// GetStoredRule for a given ID from DB
	GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error)

	// CreatePlannedMaintenance stores a given maintenance in db
	CreatePlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance) (valuer.UUID, error)

	// DeletePlannedMaintenance deletes the given maintenance in the db
	DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error

	// GetPlannedMaintenanceByID fetches the maintenance definition from db by id
	GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*ruletypes.GettablePlannedMaintenance, error)

	// EditPlannedMaintenance updates the given maintenance in the db
	EditPlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance, id valuer.UUID) error

	// GetAllPlannedMaintenance fetches the maintenance definitions from db
	GetAllPlannedMaintenance(ctx context.Context, orgID string) ([]*ruletypes.GettablePlannedMaintenance, error)

	// used for internal telemetry
	GetAlertsInfo(ctx context.Context) (*model.AlertsInfo, error)

	ListOrgs(ctx context.Context) ([]string, error)
}

type ruleDB struct {
	*sqlx.DB
	sqlstore sqlstore.SQLStore
}

func NewRuleDB(db *sqlx.DB, sqlstore sqlstore.SQLStore) RuleDB {
	return &ruleDB{db, sqlstore}
}

// CreateRule stores a given rule in db and returns task name and error (if any)
func (r *ruleDB) CreateRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
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
func (r *ruleDB) EditRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context) error) error {
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
func (r *ruleDB) DeleteRule(ctx context.Context, id valuer.UUID, cb func(context.Context) error) error {
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

func (r *ruleDB) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
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

func (r *ruleDB) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	rule := new(ruletypes.Rule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(rule).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return rule, err
	}
	return rule, nil
}

func (r *ruleDB) GetAllPlannedMaintenance(ctx context.Context, orgID string) ([]*ruletypes.GettablePlannedMaintenance, error) {
	gettableMaintenancesRules := make([]*ruletypes.GettablePlannedMaintenanceRule, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&gettableMaintenancesRules).
		Relation("Rules").
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return make([]*ruletypes.GettablePlannedMaintenance, 0), err
	}

	gettablePlannedMaintenance := make([]*ruletypes.GettablePlannedMaintenance, 0)
	for _, gettableMaintenancesRule := range gettableMaintenancesRules {
		gettablePlannedMaintenance = append(gettablePlannedMaintenance, gettableMaintenancesRule.ConvertGettableMaintenanceRuleToGettableMaintenance())
	}

	return gettablePlannedMaintenance, nil
}

func (r *ruleDB) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*ruletypes.GettablePlannedMaintenance, error) {
	storableMaintenanceRules := new(ruletypes.GettablePlannedMaintenanceRule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(storableMaintenanceRules).
		Relation("Rules").
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return new(ruletypes.GettablePlannedMaintenance), err
	}

	return storableMaintenanceRules.ConvertGettableMaintenanceRuleToGettableMaintenance(), nil
}

func (r *ruleDB) CreatePlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance) (valuer.UUID, error) {

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return valuer.UUID{}, errors.New("no claims found in context")
	}

	storablePlannedMaintenance := ruletypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: claims.Email,
			UpdatedBy: claims.Email,
		},
		Name:        maintenance.Name,
		Description: maintenance.Description,
		Schedule:    maintenance.Schedule,
		OrgID:       claims.OrgID,
	}

	maintenanceRules := make([]*ruletypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.RuleIDs {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return valuer.UUID{}, err
		}

		maintenanceRules = append(maintenanceRules, &ruletypes.StorablePlannedMaintenanceRule{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			PlannedMaintenanceID: storablePlannedMaintenance.ID,
			RuleID:               ruleID,
		})
	}

	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storablePlannedMaintenance).
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(&maintenanceRules).
			Exec(ctx)

		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return valuer.UUID{}, err
	}

	return storablePlannedMaintenance.ID, nil
}

func (r *ruleDB) DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error {
	_, err := r.sqlstore.
		BunDB().
		NewDelete().
		Model(new(ruletypes.StorablePlannedMaintenance)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return err
	}

	return nil
}

func (r *ruleDB) EditPlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance, id valuer.UUID) error {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return errors.New("no claims found in context")
	}

	storablePlannedMaintenance := ruletypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{
			ID: id,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: maintenance.CreatedAt,
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: maintenance.CreatedBy,
			UpdatedBy: claims.Email,
		},
		Name:        maintenance.Name,
		Description: maintenance.Description,
		Schedule:    maintenance.Schedule,
		OrgID:       claims.OrgID,
	}

	storablePlannedMaintenanceRules := make([]*ruletypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.RuleIDs {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return err
		}

		storablePlannedMaintenanceRules = append(storablePlannedMaintenanceRules, &ruletypes.StorablePlannedMaintenanceRule{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			RuleID:               ruleID,
			PlannedMaintenanceID: storablePlannedMaintenance.ID,
		})
	}

	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storablePlannedMaintenance).
			WherePK().
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(ruletypes.StorablePlannedMaintenanceRule)).
			Where("planned_maintenance_id = ?", storablePlannedMaintenance.ID.StringValue()).
			Exec(ctx)

		if err != nil {
			return err
		}

		_, err = r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(&storablePlannedMaintenanceRules).
			Exec(ctx)
		if err != nil {
			return err
		}
		return nil

	})
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return err
	}

	return nil
}

func (r *ruleDB) getChannels() (*[]model.ChannelItem, *model.ApiError) {
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

func (r *ruleDB) GetAlertsInfo(ctx context.Context) (*model.AlertsInfo, error) {
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
		var rule GettableRule
		if strings.Contains(alert, "time_series_v2") {
			alertsInfo.AlertsWithTSV2 = alertsInfo.AlertsWithTSV2 + 1
		}
		err = json.Unmarshal([]byte(alert), &rule)
		if err != nil {
			zap.L().Error("invalid rule data", zap.Error(err))
			continue
		}
		alertNames = append(alertNames, rule.AlertName)
		if rule.AlertType == AlertTypeLogs {
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
		} else if rule.AlertType == AlertTypeMetric {
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
			if rule.RuleType == RuleTypeAnomaly {
				alertsInfo.AnomalyBasedAlerts = alertsInfo.AnomalyBasedAlerts + 1
			}
		} else if rule.AlertType == AlertTypeTraces {
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

func (r *ruleDB) ListOrgs(ctx context.Context) ([]string, error) {
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
