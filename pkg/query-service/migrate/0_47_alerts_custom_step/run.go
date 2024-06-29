package alertscustomstep

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

var Version = "0.47-alerts-custom-step"

func Migrate(conn *sqlx.DB) error {
	ruleDB := rules.NewRuleDB(conn)
	storedRules, err := ruleDB.GetStoredRules(context.Background())
	if err != nil {
		return err
	}

	for _, storedRule := range storedRules {
		parsedRule, errs := rules.ParsePostableRule([]byte(storedRule.Data))
		if len(errs) > 0 {
			// this should not happen but if it does, we should not stop the migration
			zap.L().Error("Error parsing rule", zap.Error(multierr.Combine(errs...)), zap.Int("rule", storedRule.Id))
			continue
		}
		zap.L().Info("Rule parsed", zap.Int("rule", storedRule.Id))
		updated := false
		if parsedRule.RuleCondition != nil {
			if parsedRule.RuleCondition.QueryType() == v3.QueryTypeBuilder {
				if parsedRule.EvalWindow <= rules.Duration(6*time.Hour) {
					for _, query := range parsedRule.RuleCondition.CompositeQuery.BuilderQueries {
						if query.StepInterval > 60 {
							updated = true
							zap.L().Info("Updating step interval", zap.Int("rule", storedRule.Id), zap.Int64("old", query.StepInterval), zap.Int64("new", 60))
							query.StepInterval = 60
						}
					}
				}
			}
		}

		if !updated {
			zap.L().Info("Rule not updated", zap.Int("rule", storedRule.Id))
			continue
		}

		ruleJSON, jsonErr := json.Marshal(parsedRule)
		if jsonErr != nil {
			zap.L().Error("Error marshalling rule; skipping rule migration", zap.Error(jsonErr), zap.Int("rule", storedRule.Id))
			continue
		}

		stmt, prepareError := conn.PrepareContext(context.Background(), `UPDATE rules SET data=$3 WHERE id=$4;`)
		if prepareError != nil {
			zap.L().Error("Error in preparing statement for UPDATE to rules", zap.Error(prepareError))
			continue
		}
		defer stmt.Close()

		if _, err := stmt.Exec(ruleJSON, storedRule.Id); err != nil {
			zap.L().Error("Error in Executing prepared statement for UPDATE to rules", zap.Error(err))
		}
	}
	return nil
}
