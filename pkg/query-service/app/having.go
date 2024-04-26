package app

import (
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// applyHavingClause applies the having clause to the result
// each query has its own having clause
// there can be multiple having clauses for each query
func applyHavingClause(result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) {
	for _, result := range result {
		builderQueries := queryRangeParams.CompositeQuery.BuilderQueries

		if builderQueries != nil && (builderQueries[result.QueryName].DataSource == v3.DataSourceMetrics) {
			havingClause := builderQueries[result.QueryName].Having

			for i := 0; i < len(result.Series); i++ {
				for j := 0; j < len(result.Series[i].Points); j++ {
					if !evaluateHavingClause(havingClause, result.Series[i].Points[j].Value) {
						result.Series[i].Points = append(result.Series[i].Points[:j], result.Series[i].Points[j+1:]...)
						j--
					}
				}
			}
		}
	}
}

func evaluateHavingClause(having []v3.Having, value float64) bool {
	if len(having) == 0 {
		return true
	}

	for _, h := range having {
		switch h.Operator {
		case v3.HavingOperatorEqual:
			if value == h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorNotEqual:
			if value != h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorGreaterThan:
			if value > h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorGreaterThanOrEq:
			if value >= h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorLessThan:
			if value < h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorLessThanOrEq:
			if value <= h.Value.(float64) {
				return true
			}
		case v3.HavingOperatorIn, v3.HavingOperator(strings.ToLower(string(v3.HavingOperatorIn))):
			values, ok := h.Value.([]interface{})
			if !ok {
				return false
			}
			for _, v := range values {
				if value == v.(float64) {
					return true
				}
			}
		case v3.HavingOperatorNotIn, v3.HavingOperator(strings.ToLower(string(v3.HavingOperatorNotIn))):
			values, ok := h.Value.([]interface{})
			if !ok {
				return true
			}
			found := false
			for _, v := range values {
				if value == v.(float64) {
					found = true
					break
				}
			}
			if !found {
				return true
			}
		}
	}
	return false
}
