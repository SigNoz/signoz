package alertstov4

import (
	"context"
	"encoding/json"

	"github.com/jmoiron/sqlx"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

var Version = "0.45-alerts-to-v4"

var mapTimeAggregation = map[v3.AggregateOperator]v3.TimeAggregation{
	v3.AggregateOperatorSum:         v3.TimeAggregationSum,
	v3.AggregateOperatorMin:         v3.TimeAggregationMin,
	v3.AggregateOperatorMax:         v3.TimeAggregationMax,
	v3.AggregateOperatorSumRate:     v3.TimeAggregationRate,
	v3.AggregateOperatorAvgRate:     v3.TimeAggregationRate,
	v3.AggregateOperatorMinRate:     v3.TimeAggregationRate,
	v3.AggregateOperatorMaxRate:     v3.TimeAggregationRate,
	v3.AggregateOperatorHistQuant50: v3.TimeAggregationUnspecified,
	v3.AggregateOperatorHistQuant75: v3.TimeAggregationUnspecified,
	v3.AggregateOperatorHistQuant90: v3.TimeAggregationUnspecified,
	v3.AggregateOperatorHistQuant95: v3.TimeAggregationUnspecified,
	v3.AggregateOperatorHistQuant99: v3.TimeAggregationUnspecified,
}

var mapSpaceAggregation = map[v3.AggregateOperator]v3.SpaceAggregation{
	v3.AggregateOperatorSum:         v3.SpaceAggregationSum,
	v3.AggregateOperatorMin:         v3.SpaceAggregationMin,
	v3.AggregateOperatorMax:         v3.SpaceAggregationMax,
	v3.AggregateOperatorSumRate:     v3.SpaceAggregationSum,
	v3.AggregateOperatorAvgRate:     v3.SpaceAggregationAvg,
	v3.AggregateOperatorMinRate:     v3.SpaceAggregationMin,
	v3.AggregateOperatorMaxRate:     v3.SpaceAggregationMax,
	v3.AggregateOperatorHistQuant50: v3.SpaceAggregationPercentile50,
	v3.AggregateOperatorHistQuant75: v3.SpaceAggregationPercentile75,
	v3.AggregateOperatorHistQuant90: v3.SpaceAggregationPercentile90,
	v3.AggregateOperatorHistQuant95: v3.SpaceAggregationPercentile95,
	v3.AggregateOperatorHistQuant99: v3.SpaceAggregationPercentile99,
}

func canMigrateOperator(operator v3.AggregateOperator) bool {
	switch operator {
	case v3.AggregateOperatorSum,
		v3.AggregateOperatorMin,
		v3.AggregateOperatorMax,
		v3.AggregateOperatorSumRate,
		v3.AggregateOperatorAvgRate,
		v3.AggregateOperatorMinRate,
		v3.AggregateOperatorMaxRate,
		v3.AggregateOperatorHistQuant50,
		v3.AggregateOperatorHistQuant75,
		v3.AggregateOperatorHistQuant90,
		v3.AggregateOperatorHistQuant95,
		v3.AggregateOperatorHistQuant99:
		return true
	}
	return false
}

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
		if parsedRule.RuleCondition != nil && parsedRule.Version == "" {
			if parsedRule.RuleCondition.QueryType() == v3.QueryTypeBuilder {
				// check if all the queries can be converted to v4
				canMigrate := true
				for _, query := range parsedRule.RuleCondition.CompositeQuery.BuilderQueries {
					if query.DataSource == v3.DataSourceMetrics && query.Expression == query.QueryName {
						if !canMigrateOperator(query.AggregateOperator) {
							canMigrate = false
							break
						}
					}
				}

				if canMigrate {
					parsedRule.Version = "v4"
					for _, query := range parsedRule.RuleCondition.CompositeQuery.BuilderQueries {
						if query.DataSource == v3.DataSourceMetrics && query.Expression == query.QueryName {
							// update aggregate attribute
							if query.AggregateOperator == v3.AggregateOperatorSum ||
								query.AggregateOperator == v3.AggregateOperatorMin ||
								query.AggregateOperator == v3.AggregateOperatorMax {
								query.AggregateAttribute.Type = "Gauge"
							}
							if query.AggregateOperator == v3.AggregateOperatorSumRate ||
								query.AggregateOperator == v3.AggregateOperatorAvgRate ||
								query.AggregateOperator == v3.AggregateOperatorMinRate ||
								query.AggregateOperator == v3.AggregateOperatorMaxRate {
								query.AggregateAttribute.Type = "Sum"
							}

							if query.AggregateOperator == v3.AggregateOperatorHistQuant50 ||
								query.AggregateOperator == v3.AggregateOperatorHistQuant75 ||
								query.AggregateOperator == v3.AggregateOperatorHistQuant90 ||
								query.AggregateOperator == v3.AggregateOperatorHistQuant95 ||
								query.AggregateOperator == v3.AggregateOperatorHistQuant99 {
								query.AggregateAttribute.Type = "Histogram"
							}
							query.AggregateAttribute.DataType = v3.AttributeKeyDataTypeFloat64
							query.AggregateAttribute.IsColumn = true
							query.TimeAggregation = mapTimeAggregation[query.AggregateOperator]
							query.SpaceAggregation = mapSpaceAggregation[query.AggregateOperator]
							query.AggregateOperator = v3.AggregateOperator(query.TimeAggregation)
							updated = true
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
