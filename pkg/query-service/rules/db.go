package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRule stores rule in the db and returns tx and group name (on success)
	CreateRule(context.Context, *StoredRule, func(context.Context, int64) error) (int64, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRule(context.Context, *StoredRule, func(context.Context) error) error

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRule(context.Context, string, func(context.Context) error) error

	// GetStoredRules fetches the rule definitions from db
	GetStoredRules(ctx context.Context) ([]StoredRule, error)

	// GetStoredRule for a given ID from DB
	GetStoredRule(ctx context.Context, id string) (*StoredRule, error)

	// CreatePlannedMaintenance stores a given maintenance in db
	CreatePlannedMaintenance(ctx context.Context, maintenance PlannedMaintenance) (int64, error)

	// DeletePlannedMaintenance deletes the given maintenance in the db
	DeletePlannedMaintenance(ctx context.Context, id string) (string, error)

	// GetPlannedMaintenanceByID fetches the maintenance definition from db by id
	GetPlannedMaintenanceByID(ctx context.Context, id string) (*PlannedMaintenance, error)

	// EditPlannedMaintenance updates the given maintenance in the db
	EditPlannedMaintenance(ctx context.Context, maintenance PlannedMaintenance, id string) (string, error)

	// GetAllPlannedMaintenance fetches the maintenance definitions from db
	GetAllPlannedMaintenance(ctx context.Context) ([]PlannedMaintenance, error)

	// used for internal telemetry
	GetAlertsInfo(ctx context.Context) (*model.AlertsInfo, error)
}

type StoredRule struct {
	bun.BaseModel `bun:"rules"`

	Id        int        `json:"id" db:"id" bun:"id,pk,autoincrement"`
	CreatedAt *time.Time `json:"created_at" db:"created_at" bun:"created_at"`
	CreatedBy *string    `json:"created_by" db:"created_by" bun:"created_by"`
	UpdatedAt *time.Time `json:"updated_at" db:"updated_at" bun:"updated_at"`
	UpdatedBy *string    `json:"updated_by" db:"updated_by" bun:"updated_by"`
	Data      string     `json:"data" db:"data" bun:"data"`
}

type ruleDB struct {
	*sqlx.DB
	sqlstore sqlstore.SQLStore
}

func NewRuleDB(db *sqlx.DB, sqlstore sqlstore.SQLStore) RuleDB {
	return &ruleDB{db, sqlstore}
}

// CreateRule stores a given rule in db and returns task name and error (if any)
func (r *ruleDB) CreateRule(ctx context.Context, storedRule *StoredRule, cb func(context.Context, int64) error) (int64, error) {
	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storedRule).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx, int64(storedRule.Id))
	})

	if err != nil {
		return 0, err
	}

	return int64(storedRule.Id), nil
}

// EditRule stores a given rule string in database and returns task name and error (if any)
func (r *ruleDB) EditRule(ctx context.Context, storedRule *StoredRule, cb func(context.Context) error) error {
	return r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storedRule).
			WherePK().
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	})
}

// DeleteRule deletes a given rule with id and returns taskname and error (if any)
func (r *ruleDB) DeleteRule(ctx context.Context, id string, cb func(context.Context) error) error {
	if err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(&StoredRule{}).
			Where("id = ?", id).
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

func (r *ruleDB) GetStoredRules(ctx context.Context) ([]StoredRule, error) {

	rules := []StoredRule{}

	query := "SELECT id, created_at, created_by, updated_at, updated_by, data FROM rules"

	err := r.Select(&rules, query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return rules, nil
}

func (r *ruleDB) GetStoredRule(ctx context.Context, id string) (*StoredRule, error) {
	intId, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id parameter")
	}

	rule := &StoredRule{}

	query := fmt.Sprintf("SELECT id, created_at, created_by, updated_at, updated_by, data FROM rules WHERE id=%d", intId)
	err = r.Get(rule, query)

	// zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return rule, nil
}

func (r *ruleDB) GetAllPlannedMaintenance(ctx context.Context) ([]PlannedMaintenance, error) {
	maintenances := []PlannedMaintenance{}

	query := "SELECT id, name, description, schedule, alert_ids, created_at, created_by, updated_at, updated_by FROM planned_maintenance"

	err := r.Select(&maintenances, query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return maintenances, nil
}

func (r *ruleDB) GetPlannedMaintenanceByID(ctx context.Context, id string) (*PlannedMaintenance, error) {
	maintenance := &PlannedMaintenance{}

	query := "SELECT id, name, description, schedule, alert_ids, created_at, created_by, updated_at, updated_by FROM planned_maintenance WHERE id=$1"
	err := r.Get(maintenance, query, id)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return maintenance, nil
}

func (r *ruleDB) CreatePlannedMaintenance(ctx context.Context, maintenance PlannedMaintenance) (int64, error) {

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return 0, errors.New("no claims found in context")
	}
	maintenance.CreatedBy = claims.Email
	maintenance.CreatedAt = time.Now()
	maintenance.UpdatedBy = claims.Email
	maintenance.UpdatedAt = time.Now()

	query := "INSERT INTO planned_maintenance (name, description, schedule, alert_ids, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"

	result, err := r.Exec(query, maintenance.Name, maintenance.Description, maintenance.Schedule, maintenance.AlertIds, maintenance.CreatedAt, maintenance.CreatedBy, maintenance.UpdatedAt, maintenance.UpdatedBy)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return 0, err
	}

	return result.LastInsertId()
}

func (r *ruleDB) DeletePlannedMaintenance(ctx context.Context, id string) (string, error) {
	query := "DELETE FROM planned_maintenance WHERE id=$1"
	_, err := r.Exec(query, id)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", err
	}

	return "", nil
}

func (r *ruleDB) EditPlannedMaintenance(ctx context.Context, maintenance PlannedMaintenance, id string) (string, error) {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return "", errors.New("no claims found in context")
	}
	maintenance.UpdatedBy = claims.Email
	maintenance.UpdatedAt = time.Now()

	query := "UPDATE planned_maintenance SET name=$1, description=$2, schedule=$3, alert_ids=$4, updated_at=$5, updated_by=$6 WHERE id=$7"
	_, err := r.Exec(query, maintenance.Name, maintenance.Description, maintenance.Schedule, maintenance.AlertIds, maintenance.UpdatedAt, maintenance.UpdatedBy, id)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", err
	}

	return "", nil
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
