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
func TestMembersReturnsOnlyRequestedNameForExactResolution(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:            "deployment.environment",
		Signal:          telemetrytypes.SignalTraces,
		FieldContext:    telemetrytypes.FieldContextResource,
		FieldResolution: telemetrytypes.FieldResolutionExact,
	}

	assert.Equal(t, []string{"deployment.environment"}, Members(KindAttribute, selector), "exact resolution must not expand the semantic-convention family")
}

func TestCurrentReturnsRequestedNameForExactResolution(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:            "deployment.environment",
		Signal:          telemetrytypes.SignalTraces,
		FieldContext:    telemetrytypes.FieldContextResource,
		FieldResolution: telemetrytypes.FieldResolutionExact,
	}

	assert.Equal(t, "deployment.environment", Current(KindAttribute, selector), "exact resolution must not canonicalize the requested name")
}

func TestAttributeMembersReturnsPhysicalNameForExactResolution(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:            "resource_db_system",
		Signal:          telemetrytypes.SignalMetrics,
		FieldContext:    telemetrytypes.FieldContextResource,
		FieldResolution: telemetrytypes.FieldResolutionExact,
	}

	assert.Equal(t, []string{"resource_db_system"}, AttributeMembers(selector), "exact metric attribute resolution must not add storage variants")
}

func TestAttributeMembersIncludesMetricResourceStorageSpellings(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "db.system.name",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t, []string{
		"resource_db.system.name", "resource_db_system_name", "db.system.name", "db_system_name",
		"resource_db.system", "resource_db_system", "db.system", "db_system",
	}, AttributeMembers(selector), "resource metric attributes should cover every historical storage layout")
}

func TestCurrentAttributeResolvesNormalizedMetricResourceSpelling(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "resource_db_system",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t, "db.system.name", CurrentAttribute(selector), "normalized resource spelling should resolve to the dotted current name")
}

func TestAttributeMembersPreservesNormalizedMetricPointStyle(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "db_system",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{
		"db_system_name", "db.system.name", "db_system", "db.system",
	}, AttributeMembers(selector), "normalized point attribute should remain the preferred storage spelling")
}

func TestMetricNamesPreservesDottedStyle(t *testing.T) {
	assert.Equal(t,
		[]string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"},
		MetricNames("k8s.pod.cpu.usage"),
		"dotted metric input should produce dotted family names",
	)
}

func TestMetricNamesPreservesNormalizedStyle(t *testing.T) {
	assert.Equal(t,
		[]string{"k8s_pod_cpu_usage", "k8s_pod_cpu_utilization"},
		MetricNames("k8s_pod_cpu_utilization"),
		"normalized metric input should produce normalized family names",
	)
}

func TestMetricNamesReturnsUnknownNameUnchanged(t *testing.T) {
	assert.Equal(t, []string{"custom_metric"}, MetricNames("custom_metric"), "unknown metrics should not be expanded")
}

func TestPhaseFourTraceAttributeFamiliesResolveHistoricalNames(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	selector.Name = "db.name"
	assert.Equal(t, "db.namespace", Current(KindAttribute, selector), "database namespace rename should be enabled")
	selector.Name = "db.operation"
	assert.Equal(t, "db.operation.name", Current(KindAttribute, selector), "database operation rename should be enabled")
	selector.Name = "db.statement"
	assert.Equal(t, "db.query.text", Current(KindAttribute, selector), "database query rename should be enabled")
	selector.Name = "rpc.system"
	assert.Equal(t, "rpc.system.name", Current(KindAttribute, selector), "RPC system rename should be enabled")
	selector.Name = "peer.service"
	assert.Equal(t, "service.peer.name", Current(KindAttribute, selector), "peer service rename should be enabled")
	selector.Name = "messaging.destination"
	assert.Equal(t, "messaging.destination.name", Current(KindAttribute, selector), "messaging destination rename should be enabled")
	selector.Name = "messaging.operation"
	assert.Equal(t, "messaging.operation.type", Current(KindAttribute, selector), "messaging operation rename should be enabled")
	selector.Name = "messaging.kafka.consumer.group"
	assert.Equal(t, "messaging.consumer.group.name", Current(KindAttribute, selector), "messaging consumer group rename should be enabled")
	selector.Name = "messaging.client_id"
	assert.Equal(t, "messaging.client.id", Current(KindAttribute, selector), "messaging client rename should be enabled")
	selector.Name = "container.runtime"
	assert.Equal(t, "container.runtime.name", Current(KindAttribute, selector), "container runtime rename should be enabled")
	selector.Name = "code.filepath"
	assert.Equal(t, "code.file.path", Current(KindAttribute, selector), "code file rename should be enabled")
	selector.Name = "code.function"
	assert.Equal(t, "code.function.name", Current(KindAttribute, selector), "code function rename should be enabled")
	selector.Name = "code.lineno"
	assert.Equal(t, "code.line.number", Current(KindAttribute, selector), "code line rename should be enabled")
	selector.Name = "http.method"
	assert.Equal(t, "http.request.method", Current(KindAttribute, selector), "HTTP method rename should be enabled")
	selector.Name = "http.status_code"
	assert.Equal(t, "http.response.status_code", Current(KindAttribute, selector), "HTTP status rename should be enabled")
	selector.Name = "http.url"
	assert.Equal(t, "url.full", Current(KindAttribute, selector), "HTTP URL rename should be enabled")
	selector.Name = "http.scheme"
	assert.Equal(t, "url.scheme", Current(KindAttribute, selector), "HTTP scheme rename should be enabled")
	selector.Name = "http.user_agent"
	assert.Equal(t, "user_agent.original", Current(KindAttribute, selector), "HTTP user-agent rename should be enabled")
}

func TestHTTPMethodFamilyDoesNotApplyToMetrics(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "http.method",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{"http.method"}, Members(KindAttribute, selector), "HTTP method attribute rename is not scoped to metrics")
}

func TestDBNamespaceFamilyDoesNotApplyToLogs(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "db.name",
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{"db.name"}, Members(KindAttribute, selector), "database namespace rename is trace-only")
}

func TestHTTPMethodFamilyAppliesToLogs(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "http.method",
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{"http.request.method", "http.method"}, Members(KindAttribute, selector), "HTTP method rename should apply to logs")
}
