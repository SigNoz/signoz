package rules

import (
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// Monotonicity describes the direction of value change as more data is processed
type Monotonicity int

const (
	MonotonicityNone       Monotonicity = iota
	MonotonicityIncreasing              // Value only goes up or stays same
	MonotonicityDecreasing              // Value only goes down or stays same
)

// Aggregation holds both time and space aggregation
type Aggregation struct {
	Time  metrictypes.TimeAggregation
	Space metrictypes.SpaceAggregation
}

// SafeAggregations maps an aggregation pair to its monotonic behavior
var SafeAggregations = map[Aggregation]Monotonicity{
	// --- Min Aggregation ---
	{Time: metrictypes.TimeAggregationMin, Space: metrictypes.SpaceAggregationMin}:         MonotonicityDecreasing,
	{Time: metrictypes.TimeAggregationMin, Space: metrictypes.SpaceAggregationUnspecified}: MonotonicityDecreasing, // Logs/Trace

	// --- Max Aggregation ---
	{Time: metrictypes.TimeAggregationMax, Space: metrictypes.SpaceAggregationMax}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationMax, Space: metrictypes.SpaceAggregationSum}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationMax, Space: metrictypes.SpaceAggregationUnspecified}: MonotonicityIncreasing, // Logs/Trace

	// --- Increase Aggregation ---
	{Time: metrictypes.TimeAggregationIncrease, Space: metrictypes.SpaceAggregationMax}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationIncrease, Space: metrictypes.SpaceAggregationSum}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationIncrease, Space: metrictypes.SpaceAggregationUnspecified}: MonotonicityIncreasing, // Logs/Trace

	// --- Count Aggregation ---
	{Time: metrictypes.TimeAggregationCount, Space: metrictypes.SpaceAggregationSum}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationCount, Space: metrictypes.SpaceAggregationUnspecified}: MonotonicityIncreasing, // Logs/Trace

	// --- Count Distinct Aggregation ---
	{Time: metrictypes.TimeAggregationCountDistinct, Space: metrictypes.SpaceAggregationSum}:         MonotonicityIncreasing,
	{Time: metrictypes.TimeAggregationCountDistinct, Space: metrictypes.SpaceAggregationUnspecified}: MonotonicityIncreasing, // Logs/Trace
}

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

	// Phase 2: Get match type and compare operator from thresholds
	matchType, compareOp, ok := getThresholdMatchTypeAndCompareOp(rule)
	if !ok {
		return defaultDelay
	}

	// Phase 3: Check if all queries are safe
	for _, query := range rule.RuleCondition.CompositeQuery.Queries {
		if !isQuerySafe(query, matchType, compareOp) {
			return defaultDelay
		}
	}

	// Phase 4: All queries are safe, delay can be removed
	return 0
}

// isRuleConditionValid checks if the rule condition is valid for delay calculation.
// Returns false if the rule condition is nil, has no queries, or has invalid thresholds.
func isRuleConditionValid(rule *ruletypes.PostableRule) bool {
	if rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
		return false
	}

	// BuilderQueries, PromQL Queries, ClickHouse SQL Queries attributes of CompositeQuery
	// are not supported for now, only Queries attribute is supported
	if len(rule.RuleCondition.CompositeQuery.Queries) == 0 {
		return false
	}

	// Validate that thresholds exist and contain valid match type and compare operator
	matchType, compareOp, ok := getThresholdMatchTypeAndCompareOp(rule)
	if !ok {
		return false
	}

	if matchType == ruletypes.MatchTypeNone || compareOp == ruletypes.CompareOpNone {
		return false
	}

	return true
}

// getThresholdMatchTypeAndCompareOp extracts match type and compare operator from the rule's thresholds.
// Returns the match type, compare operator, and a boolean indicating success.
// All thresholds share the same match type and compare operator, so we use the first threshold's values.
func getThresholdMatchTypeAndCompareOp(rule *ruletypes.PostableRule) (ruletypes.MatchType, ruletypes.CompareOp, bool) {
	if rule.RuleCondition == nil || rule.RuleCondition.Thresholds == nil {
		return ruletypes.MatchTypeNone, ruletypes.CompareOpNone, false
	}

	// Get the threshold interface
	threshold, err := rule.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return ruletypes.MatchTypeNone, ruletypes.CompareOpNone, false
	}

	// Cast to BasicRuleThresholds (only supported kind)
	basicThresholds, ok := threshold.(ruletypes.BasicRuleThresholds)
	if !ok || len(basicThresholds) == 0 {
		return ruletypes.MatchTypeNone, ruletypes.CompareOpNone, false
	}

	// Use first threshold's MatchType and CompareOp (all thresholds share the same values)
	matchType := basicThresholds[0].MatchType
	compareOp := basicThresholds[0].CompareOp

	return matchType, compareOp, true
}

// aggregationExpressionToTimeAggregation converts the aggregation expression to the corresponding time aggregation
// based on the expression
// if the expression is not a valid aggregation expression, it returns the unspecified time aggregation
// Note: Longer/more specific prefixes (e.g., "count_distinct") must be checked before shorter ones (e.g., "count")
func aggregationExpressionToTimeAggregation(expression string) metrictypes.TimeAggregation {
	expression = strings.TrimSpace(strings.ToLower(expression))
	switch {
	case strings.HasPrefix(expression, "count_distinct"):
		return metrictypes.TimeAggregationCountDistinct
	case strings.HasPrefix(expression, "count"):
		return metrictypes.TimeAggregationCount
	case strings.HasPrefix(expression, "min"):
		return metrictypes.TimeAggregationMin
	case strings.HasPrefix(expression, "max"):
		return metrictypes.TimeAggregationMax
	case strings.HasPrefix(expression, "avg"):
		return metrictypes.TimeAggregationAvg
	case strings.HasPrefix(expression, "sum"):
		return metrictypes.TimeAggregationSum
	case strings.HasPrefix(expression, "rate"):
		return metrictypes.TimeAggregationRate
	case strings.HasPrefix(expression, "increase"):
		return metrictypes.TimeAggregationIncrease
	case strings.HasPrefix(expression, "latest"):
		return metrictypes.TimeAggregationLatest
	default:
		return metrictypes.TimeAggregationUnspecified
	}
}

// extractAggregationsFromQuerySpec extracts the aggregation (time and space) from the query spec
func extractAggregationsFromQuerySpec(spec any) []Aggregation {
	aggs := []Aggregation{}

	// Extract the time aggregation from the query spec
	// based on different types of query spec
	switch spec := spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		for _, agg := range spec.Aggregations {
			aggs = append(aggs, Aggregation{
				Time:  agg.TimeAggregation,
				Space: agg.SpaceAggregation,
			})
		}
	// the log and trace aggregations don't store the time aggregation directly but expression for the aggregation
	// so we need to convert the expression to the corresponding time aggregation
	// logs and traces don't support space aggregation in the same way, so we assume Unspecified
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		for _, agg := range spec.Aggregations {
			aggs = append(aggs, Aggregation{
				Time:  aggregationExpressionToTimeAggregation(agg.Expression),
				Space: metrictypes.SpaceAggregationUnspecified,
			})
		}
	case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
		for _, agg := range spec.Aggregations {
			aggs = append(aggs, Aggregation{
				Time:  aggregationExpressionToTimeAggregation(agg.Expression),
				Space: metrictypes.SpaceAggregationUnspecified,
			})
		}
	}
	return aggs
}

// isQuerySafe determines if a single query is safe to remove the eval delay.
// A query is safe only if it's a Builder query (with MetricAggregation, LogAggregation, or TraceAggregation type)
// and all its aggregations are safe (checked against SafeCombinations map).
func isQuerySafe(query qbtypes.QueryEnvelope, matchType ruletypes.MatchType, compareOp ruletypes.CompareOp) bool {
	// We only handle Builder Queries for now
	if query.Type != qbtypes.QueryTypeBuilder {
		return false
	}

	// extract aggregations from the query spec
	aggs := extractAggregationsFromQuerySpec(query.Spec)

	// A query must have at least one aggregation
	if len(aggs) == 0 {
		return false
	}

	// All aggregations in the query must be safe
	for _, agg := range aggs {
		if !isAggregationSafe(agg, matchType, compareOp) {
			return false
		}
	}

	return true
}

// isAggregationSafe checks if the aggregation is safe to remove the eval delay
func isAggregationSafe(agg Aggregation, matchType ruletypes.MatchType, compareOp ruletypes.CompareOp) bool {
	// Get Monotonicity
	monotonicity, ok := SafeAggregations[agg]
	if !ok {
		return false
	}
	switch monotonicity {
	case MonotonicityDecreasing:
		if matchType == ruletypes.AtleastOnce || matchType == ruletypes.AllTheTimes {
			if compareOp == ruletypes.ValueIsBelow || compareOp == ruletypes.ValueBelowOrEq {
				return true
			}
		}
	case MonotonicityIncreasing:
		if matchType == ruletypes.AtleastOnce || matchType == ruletypes.AllTheTimes || matchType == ruletypes.InTotal {
			if compareOp == ruletypes.ValueIsAbove || compareOp == ruletypes.ValueAboveOrEq {
				return true
			}
		}
	}

	return false
}
