package slo

import "fmt"

const DefaultChannelName = "sre-sidekick-default"

func BurnRuleName(sloName, tier string) string {
	return fmt.Sprintf("SLO %s burn - %s", tier, sloName)
}

func BuildBurnRateRule(sloName string, tier BurnTier, channel string, scope ...string) map[string]any {
	filter := fmt.Sprintf("slo = '%s' AND tier = '%s'", sloName, tier.Name)
	if len(scope) >= 2 {
		filter += fmt.Sprintf(" AND service = '%s' AND environment = '%s'", scope[0], scope[1])
	}
	return map[string]any{
		"alert": BurnRuleName(sloName, tier.Name), "alertType": "METRIC_BASED_ALERT",
		"description": fmt.Sprintf("%s burn for SLO %q exceeded %gx.", tier.Name, sloName, tier.Threshold),
		"ruleType":    "threshold_rule", "evalWindow": tier.ShortWindow, "frequency": "1m", "version": "v5",
		"labels":            map[string]any{"severity": tier.Severity, "slo": sloName, "tier": tier.Name},
		"preferredChannels": []any{channel},
		"condition": map[string]any{
			"compositeQuery": map[string]any{"queryType": "builder", "queries": []any{map[string]any{
				"type": "builder_query", "spec": map[string]any{
					"name": "A", "signal": "metrics", "aggregations": []any{map[string]any{"metricName": "slo_burn_rate", "spaceAggregation": "max"}},
					"filter": map[string]any{"expression": filter}, "stepInterval": "1m",
				},
			}}},
			"target": 0.5, "matchType": "1", "op": "1", "selectedQuery": "A",
		},
	}
}
