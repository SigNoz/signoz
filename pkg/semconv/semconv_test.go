package semconv

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestMembersReturnsCurrentBeforeHistoricalName(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		Members(KindAttribute, selector),
		"members should use current-first fallback order",
	)
}

func TestCurrentReturnsCanonicalName(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t,
		"deployment.environment.name",
		Current(KindAttribute, selector),
		"historical name should resolve to the current family name",
	)
}

func TestAllScopedFamilyMatchesSupportedScopes(t *testing.T) {
	tests := []struct {
		name         string
		signal       telemetrytypes.Signal
		fieldContext telemetrytypes.FieldContext
	}{
		{name: "trace resource", signal: telemetrytypes.SignalTraces, fieldContext: telemetrytypes.FieldContextResource},
		{name: "trace attribute", signal: telemetrytypes.SignalTraces, fieldContext: telemetrytypes.FieldContextAttribute},
		{name: "log resource", signal: telemetrytypes.SignalLogs, fieldContext: telemetrytypes.FieldContextResource},
		{name: "log attribute", signal: telemetrytypes.SignalLogs, fieldContext: telemetrytypes.FieldContextAttribute},
		{name: "metric resource", signal: telemetrytypes.SignalMetrics, fieldContext: telemetrytypes.FieldContextResource},
		{name: "metric attribute", signal: telemetrytypes.SignalMetrics, fieldContext: telemetrytypes.FieldContextAttribute},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			selector := telemetrytypes.FieldKeySelector{
				Name:         "deployment.environment",
				Signal:       test.signal,
				FieldContext: test.fieldContext,
			}

			assert.Equal(t,
				"deployment.environment.name",
				Current(KindAttribute, selector),
				"an all-scoped family should match every supported signal and attribute context",
			)
		})
	}
}

func TestMembersReturnsInputWhenKindDoesNotMatch(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:   "deployment.environment",
		Signal: telemetrytypes.SignalTraces,
	}

	assert.Equal(t,
		[]string{"deployment.environment"},
		Members(KindMetric, selector),
		"an attribute family must not match a metric-name lookup",
	)
}

func TestFamilySignalsGateResolution(t *testing.T) {
	swapFamilies(t, []Family{{
		current: "gated.current",
		kind:    KindAttribute,
		members: []Member{{name: "gated.old"}},
		signals: []telemetrytypes.Signal{telemetrytypes.SignalLogs, telemetrytypes.SignalTraces},
	}})
	metrics := telemetrytypes.FieldKeySelector{Name: "gated.old", Signal: telemetrytypes.SignalMetrics}
	logs := telemetrytypes.FieldKeySelector{Name: "gated.old", Signal: telemetrytypes.SignalLogs}

	assert.Equal(t, []string{"gated.old"}, Members(KindAttribute, metrics),
		"a family gated to traces and logs must stay literal for metrics")
	assert.Equal(t, []string{"gated.current", "gated.old"}, Members(KindAttribute, logs),
		"the gate admits the signals it lists")
}

func TestMetricNameFamilyResolves(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{Name: "k8s.pod.cpu.utilization", Signal: telemetrytypes.SignalMetrics}

	assert.Equal(t, []string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"}, Members(KindMetric, selector))
	assert.Equal(t, "k8s.pod.cpu.usage", Current(KindMetric, selector))
	assert.Equal(t, []string{"k8s.pod.cpu.utilization"}, Members(KindAttribute, selector),
		"a metric-name family must not match an attribute lookup")
}

func TestMembersReturnsSharedSliceForUnscopedFamily(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{Name: "deployment.environment", Signal: telemetrytypes.SignalTraces}

	first := Members(KindAttribute, selector)
	second := Members(KindAttribute, selector)
	assert.Equal(t, &first[0], &second[0],
		"a family whose members all admit must return the precomputed slice, not a copy")
}

func TestAllIteratesEnabledFamilies(t *testing.T) {
	currents := []string{}
	for family := range All() {
		currents = append(currents, family.Current())
	}
	assert.Contains(t, currents, "deployment.environment.name")
	assert.Contains(t, currents, "k8s.pod.cpu.usage")
}

// swapFamilies replaces the generated table for one test so scoped-member and
// fan-out behavior can be pinned without enabling such families for real.
func swapFamilies(t *testing.T, replacement []Family) {
	t.Helper()
	prevFamilies, prevIndex, prevMembers := families, memberToFamilies, familyMembers
	families = replacement
	memberToFamilies, familyMembers = buildIndexes()
	t.Cleanup(func() {
		families, memberToFamilies, familyMembers = prevFamilies, prevIndex, prevMembers
	})
}

func TestFanOutResolvesOnlyWithEnoughInformation(t *testing.T) {
	swapFamilies(t, []Family{
		{
			current: "cpu.mode",
			kind:    KindAttribute,
			members: []Member{{name: "state", applyToMetrics: []string{"system.cpu.time"}}},
		},
		{
			current: "db.client.connection.state",
			kind:    KindAttribute,
			members: []Member{{name: "state", applyToMetrics: []string{"db.client.connections.usage"}}},
		},
	})

	ambiguous := telemetrytypes.FieldKeySelector{Name: "state", Signal: telemetrytypes.SignalMetrics}
	assert.Equal(t, []string{"state"}, Members(KindAttribute, ambiguous),
		"without a metric name, a fanned-out member admits several families and must stay literal")

	pinned := ambiguous
	pinned.MetricContext = &telemetrytypes.MetricContext{MetricName: "system.cpu.time"}
	assert.Equal(t, []string{"cpu.mode", "state"}, Members(KindAttribute, pinned),
		"the metric name disambiguates the fan-out")

	outside := ambiguous
	outside.MetricContext = &telemetrytypes.MetricContext{MetricName: "http.server.duration"}
	assert.Equal(t, []string{"state"}, Members(KindAttribute, outside),
		"a metric outside every apply_to_metrics list resolves no family")
}

func TestMemberScopesFilterMembers(t *testing.T) {
	swapFamilies(t, []Family{{
		current: "user_agent.original",
		kind:    KindAttribute,
		members: []Member{
			{name: "http.user_agent", contexts: []telemetrytypes.FieldContext{telemetrytypes.FieldContextAttribute}, signals: []telemetrytypes.Signal{telemetrytypes.SignalTraces}},
			{name: "browser.user_agent", contexts: []telemetrytypes.FieldContext{telemetrytypes.FieldContextResource}},
		},
	}})

	resource := telemetrytypes.FieldKeySelector{
		Name:         "user_agent.original",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}
	assert.Equal(t, []string{"user_agent.original", "browser.user_agent"}, Members(KindAttribute, resource),
		"a strict resource lookup must not include the span-only member")

	attribute := resource
	attribute.FieldContext = telemetrytypes.FieldContextAttribute
	assert.Equal(t, []string{"user_agent.original", "http.user_agent"}, Members(KindAttribute, attribute),
		"a strict attribute lookup must not include the resource-only member")

	strictResourceOldSpan := resource
	strictResourceOldSpan.Name = "http.user_agent"
	assert.Equal(t, []string{"http.user_agent"}, Members(KindAttribute, strictResourceOldSpan),
		"an old spelling outside its own scope stays literal")
}
