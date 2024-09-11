package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRuleTx stores rule in the db and returns tx and group name (on success)
	CreateRuleTx(ctx context.Context, rule string) (int64, Tx, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRuleTx(ctx context.Context, rule string, id string) (string, Tx, error)

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRuleTx(ctx context.Context, id string) (string, Tx, error)

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
	Id        int        `json:"id" db:"id"`
	CreatedAt *time.Time `json:"created_at" db:"created_at"`
	CreatedBy *string    `json:"created_by" db:"created_by"`
	UpdatedAt *time.Time `json:"updated_at" db:"updated_at"`
	UpdatedBy *string    `json:"updated_by" db:"updated_by"`
	Data      string     `json:"data" db:"data"`
}

type Tx interface {
	Commit() error
	Rollback() error
}

type ruleDB struct {
	*sqlx.DB
}

// todo: move init methods for creating tables

func NewRuleDB(db *sqlx.DB) RuleDB {
	return &ruleDB{
		db,
	}
}

// CreateRuleTx stores a given rule in db and returns task name,
// sql tx and error (if any)
func (r *ruleDB) CreateRuleTx(ctx context.Context, rule string) (int64, Tx, error) {
	var lastInsertId int64

	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
	}
	createdAt := time.Now()
	updatedAt := time.Now()
	tx, err := r.Begin()
	if err != nil {
		return lastInsertId, nil, err
	}

	stmt, err := tx.Prepare(`INSERT into rules (created_at, created_by, updated_at, updated_by, data) VALUES($1,$2,$3,$4,$5);`)
	if err != nil {
		zap.L().Error("Error in preparing statement for INSERT to rules", zap.Error(err))
		tx.Rollback()
		return lastInsertId, nil, err
	}

	defer stmt.Close()

	result, err := stmt.Exec(createdAt, userEmail, updatedAt, userEmail, rule)
	if err != nil {
		zap.L().Error("Error in Executing prepared statement for INSERT to rules", zap.Error(err))
		tx.Rollback() // return an error too, we may want to wrap them
		return lastInsertId, nil, err
	}

	lastInsertId, err = result.LastInsertId()
	if err != nil {
		zap.L().Error("Error in getting last insert id for INSERT to rules\n", zap.Error(err))
		tx.Rollback() // return an error too, we may want to wrap them
		return lastInsertId, nil, err
	}

	return lastInsertId, tx, nil
}

// EditRuleTx stores a given rule string in database and returns
// task name, sql tx and error (if any)
func (r *ruleDB) EditRuleTx(ctx context.Context, rule string, id string) (string, Tx, error) {

	var groupName string
	idInt, _ := strconv.Atoi(id)
	if idInt == 0 {
		return groupName, nil, fmt.Errorf("failed to read alert id from parameters")
	}

	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
	}
	updatedAt := time.Now()
	groupName = prepareTaskName(int64(idInt))

	// todo(amol): resolve this error - database locked when using
	// edit transaction with sqlx
	// tx, err := r.Begin()
	//if err != nil {
	//	return groupName, tx, err
	//}
	stmt, err := r.Prepare(`UPDATE rules SET updated_by=$1, updated_at=$2, data=$3 WHERE id=$4;`)
	if err != nil {
		zap.L().Error("Error in preparing statement for UPDATE to rules", zap.Error(err))
		// tx.Rollback()
		return groupName, nil, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(userEmail, updatedAt, rule, idInt); err != nil {
		zap.L().Error("Error in Executing prepared statement for UPDATE to rules", zap.Error(err))
		// tx.Rollback() // return an error too, we may want to wrap them
		return groupName, nil, err
	}
	return groupName, nil, nil
}

// DeleteRuleTx deletes a given rule with id and returns
// taskname, sql tx and error (if any)
func (r *ruleDB) DeleteRuleTx(ctx context.Context, id string) (string, Tx, error) {

	idInt, _ := strconv.Atoi(id)
	groupName := prepareTaskName(int64(idInt))

	// commented as this causes db locked error
	// tx, err := r.Begin()
	// if err != nil {
	// 	return groupName, tx, err
	// }

	stmt, err := r.Prepare(`DELETE FROM rules WHERE id=$1;`)

	if err != nil {
		return groupName, nil, err
	}

	defer stmt.Close()

	if _, err := stmt.Exec(idInt); err != nil {
		zap.L().Error("Error in Executing prepared statement for DELETE to rules", zap.Error(err))
		// tx.Rollback()
		return groupName, nil, err
	}

	return groupName, nil, nil
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

	email, _ := auth.GetEmailFromJwt(ctx)
	maintenance.CreatedBy = email
	maintenance.CreatedAt = time.Now()
	maintenance.UpdatedBy = email
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
	email, _ := auth.GetEmailFromJwt(ctx)
	maintenance.UpdatedBy = email
	maintenance.UpdatedAt = time.Now()

	query := "UPDATE planned_maintenance SET name=$1, description=$2, schedule=$3, alert_ids=$4, updated_at=$5, updated_by=$6 WHERE id=$7"
	_, err := r.Exec(query, maintenance.Name, maintenance.Description, maintenance.Schedule, maintenance.AlertIds, maintenance.UpdatedAt, maintenance.UpdatedBy, id)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", err
	}

	return "", nil
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
		} else if rule.AlertType == AlertTypeTraces {
			alertsInfo.TracesBasedAlerts = alertsInfo.TracesBasedAlerts + 1
		}
		alertsInfo.TotalAlerts = alertsInfo.TotalAlerts + 1
	}
	alertsInfo.AlertNames = alertNames
	return &alertsInfo, nil
}
