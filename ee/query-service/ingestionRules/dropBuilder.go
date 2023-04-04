package ingestionRules

import (
	"go.signoz.io/signoz/ee/query-service/model"
	filterprocessor "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/filterprocessor"
)

// this file contains methods to transform ingestion rules into
// collector config components

func PrepareDropFilter(rules []model.IngestionRule) (*filterprocessor.Config, error) {
	metricRules := getMetricRules(rules)

	metricExprs, err := PrepareDropExpressions(metricRules)
	if len(err) > 0 {
		return nil, err[0]
	}
	return &filterprocessor.Config{
		Metrics: filterprocessor.MetricFilters{
			DataPointConditions: metricExprs,
		},
	}, nil
}

// PrepareDropExpression creates the final OTTL expression for filter processor
func PrepareDropExpressions(rules []model.IngestionRule) (result []string, fnerr []error) {
	// result captures the final expression to be set in fitler processor
	if len(rules) == 0 {
		return result, nil
	}

	for _, r := range rules {
		if r.RuleType == model.IngestionRuleTypeDrop {
			expr, err := r.Config.DropConfig.PrepareExpression()
			if err != nil {
				fnerr = append(fnerr, err)
			}
			result = append(result, expr)
		}
	}

	return result, nil
}

func getMetricRules(allRules []model.IngestionRule) []model.IngestionRule {
	metricRules := make([]model.IngestionRule, 0)
	for _, r := range allRules {
		if r.RuleType == model.IngestionRuleTypeDrop && r.Source == model.IngestionSourceMetrics {
			metricRules = append(metricRules, r)
		}
	}
	return metricRules
}
