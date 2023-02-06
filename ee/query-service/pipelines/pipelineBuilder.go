package pipelines

import (
	"go.signoz.io/signoz/ee/query-service/model"
)

// "github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/operator/helper"

// this file contains methods to transform ingestion rules into
// collector config components
func PreparePipelineProcessor(pipelines []model.Pipeline) ([]model.Pipeline, error) {
	// metricRules := getMetricRules(rules)

	// metricExprs, err := PrepareDropExpressions(metricRules)
	// if len(err) > 0 {
	// 	return nil, err[0]
	// }
	// return &filterprocessor.Config{
	// 	Metrics: filterprocessor.MetricFilters{
	// 		DataPointConditions: metricExprs,
	// 	},
	// }, nil
	return pipelines, nil
}
