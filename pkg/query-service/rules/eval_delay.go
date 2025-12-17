package rules

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// CalculateEvalDelay determines if the default evaluation delay can be removed (set to 0)
// based on the rule's match type, compare operator, and aggregation type.
// If the combination ensures that new data will not invalidate the alert condition
// (e.g. values only increase for a "Greater Than" check), the delay is removed.
//
// A combination is considered "safe" if new data arriving late cannot invalidate
// a previously triggered alert condition. This happens when:
//   - The aggregation function is monotonic (only increases or only decreases)
//   - The comparison operator aligns with the monotonic direction
//   - The match type allows the safety property to hold
//
// Safe combinations include:
//   - Min aggregation + Below/BelowOrEq operators (Min can only decrease)
//   - Max aggregation + Above/AboveOrEq operators (Max can only increase)
//   - Count/CountDistinct + Above/AboveOrEq operators (Count can only increase)
//
// Returns 0 if all queries are safe, otherwise returns defaultDelay.
func CalculateEvalDelay(rule *ruletypes.PostableRule, defaultDelay time.Duration) time.Duration {
	// Phase 1: Validate rule condition
	if !isRuleConditionValid(rule) {
		return defaultDelay
	}

	matchType := rule.RuleCondition.MatchType
	compareOp := rule.RuleCondition.CompareOp

	// Phase 2: Check if all queries are safe
	for _, query := range rule.RuleCondition.CompositeQuery.Queries {
		if !isQuerySafe(query, matchType, compareOp) {
			return defaultDelay
		}
	}

	// Phase 3: All queries are safe, delay can be removed
	return 0
}

// isRuleConditionValid checks if the rule condition is valid for delay calculation.
// Returns false if the rule condition is nil, has no queries, or has invalid match/compare operators.
func isRuleConditionValid(rule *ruletypes.PostableRule) bool {
	if rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
		return false
	}

	// BuilderQueries, PromQL Queries, ClickHouse SQL Queries attributes of CompositeQuery
	// are not supported for now, only Queries attribute is supported
	if len(rule.RuleCondition.CompositeQuery.Queries) == 0 {
		return false
	}

	matchType := rule.RuleCondition.MatchType
	compareOp := rule.RuleCondition.CompareOp

	if matchType == ruletypes.MatchTypeNone || compareOp == ruletypes.CompareOpNone {
		return false
	}

	return true
}

// isQuerySafe determines if a single query is safe to remove the eval delay.
// A query is safe only if it's a Builder query with MetricAggregation type
// and all its aggregations are safe.
func isQuerySafe(query qbtypes.QueryEnvelope, matchType ruletypes.MatchType, compareOp ruletypes.CompareOp) bool {
	// We only handle Builder Queries for now
	if query.Type != qbtypes.QueryTypeBuilder {
		return false
	}

	// Check the Spec type - only MetricAggregation queries are supported
	spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation])
	if !ok {
		return false
	}

	// A query must have at least one aggregation
	if len(spec.Aggregations) == 0 {
		return false
	}

	// All aggregations in the query must be safe
	for _, agg := range spec.Aggregations {
		if !isAggregationSafe(agg.TimeAggregation, matchType, compareOp) {
			return false
		}
	}

	return true
}

// isAggregationSafe checks if the aggregation is safe to remove the eval delay
func isAggregationSafe(timeAgg metrictypes.TimeAggregation, matchType ruletypes.MatchType, compareOp ruletypes.CompareOp) bool {
	switch timeAgg {
	case metrictypes.TimeAggregationMin:
		// Group: Min, MinIf
		// Value can only go down or remain same.

		if matchType == ruletypes.AtleastOnce || matchType == ruletypes.AllTheTimes {
			if compareOp == ruletypes.ValueIsBelow || compareOp == ruletypes.ValueBelowOrEq {
				return true
			}
		}

	case metrictypes.TimeAggregationMax:
		// Group: Max, MaxIf
		// Value can only go up or remain same.

		if matchType == ruletypes.AtleastOnce || matchType == ruletypes.AllTheTimes {
			if compareOp == ruletypes.ValueIsAbove || compareOp == ruletypes.ValueAboveOrEq {
				return true
			}
		}

	case metrictypes.TimeAggregationCount, metrictypes.TimeAggregationCountDistinct:
		// Group: Count
		// Value can only go up or remain same.

		if matchType == ruletypes.AtleastOnce || matchType == ruletypes.AllTheTimes {
			if compareOp == ruletypes.ValueIsAbove || compareOp == ruletypes.ValueAboveOrEq {
				return true
			}
		}

		// Other aggregations (Sum, Avg, Rate, etc.) are not safe.
	}

	return false
}
