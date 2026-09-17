package slo

import (
	"strings"
	"testing"
)

func TestBuildDashboardAndBurnRuleAreStable(t *testing.T) {
	dashboard := BuildDashboard()
	if dashboard["title"] != DashboardTitle || len(dashboard["widgets"].([]any)) != 8 {
		t.Fatalf("unexpected dashboard: %#v", dashboard)
	}
	rule := BuildBurnRateRule("checkout", BurnTier{Name: "fast", ShortWindow: "5m", Threshold: 14.4, Severity: "page"}, DefaultChannelName)
	if rule["alert"] != "SLO fast burn - checkout" || !strings.Contains(rule["description"].(string), "14.4") {
		t.Fatalf("unexpected burn rule: %#v", rule)
	}
}
