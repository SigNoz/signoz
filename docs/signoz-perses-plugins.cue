// SigNoz Perses Plugin Schemas
//
// CUE schemas for all SigNoz-specific Perses plugin types.
// These define the `spec` shape inside Perses Plugin wrappers:
//   { "kind": "<PluginKind>", "spec": <validated by this file> }
//
// Perses core types (Dashboard, Panel, Layout, Variable envelopes)
// are validated by Perses itself. This file only covers SigNoz plugins.
//
// Usage:
//   percli lint --schema-dir ./signoz-perses-plugins dashboard.json
//
// Reference: https://perses.dev/perses/docs/api/plugin/

package signoz

// ============================================================================
// Datasource Plugin
// ============================================================================

// SigNozDatasource configures the connection to a SigNoz query service.
// Used inside: DatasourceSpec.plugin { kind: "SigNozDatasource", spec: ... }
#SigNozDatasource: {
	// Direct URL for embedded mode (SigNoz serves its own dashboards).
	// The frontend calls SigNoz APIs directly at this base URL.
	directUrl?: string & =~"^/|^https?://"

	// HTTP proxy config for external mode (standalone Perses connecting to SigNoz).
	proxy?: #HTTPProxy
}

#HTTPProxy: {
	kind: "HTTPProxy"
	spec: {
		url: string & =~"^https?://"
		allowedEndpoints?: [...#AllowedEndpoint]
	}
}

#AllowedEndpoint: {
	endpointPattern: string
	method:          "GET" | "POST" | "PUT" | "DELETE"
}

// ============================================================================
// Query Plugins
// ============================================================================

// SigNozBuilderQuery is a single builder query for one signal.
// Used inside: TimeSeriesQuery.spec.plugin { kind: "SigNozBuilderQuery", spec: ... }
// Use this when the panel has independent queries (no formulas, joins, or trace operators).
#SigNozBuilderQuery: {
	name:   #QueryName
	signal: #Signal
	source?: string

	disabled?: bool | *false

	// Metrics use structured aggregations; traces/logs use expression aggregations
	aggregations?: [...#MetricAggregation | #ExpressionAggregation]

	filter?:   #Filter
	groupBy?:  [...#GroupByKey]
	order?:    [...#OrderBy]
	having?:   #Having

	selectFields?: [...#TelemetryFieldKey]

	limit?:  int & >=0 & <=10000
	limitBy?: #LimitBy
	offset?: int & >=0
	cursor?: string

	secondaryAggregations?: [...#SecondaryAggregation]
	functions?: [...#PostProcessingFunction]

	legend?:       string
	reduceTo?:     #ReduceTo
	stepInterval?: #StepInterval
}

// SigNozCompositeQuery bundles multiple queries with formulas, joins, or trace operators.
// Used inside: TimeSeriesQuery.spec.plugin { kind: "SigNozCompositeQuery", spec: ... }
// Use this when a panel needs cross-query references (A/B formulas, joins, trace operators).
#SigNozCompositeQuery: {
	queries: [...#CompositeQueryEntry] & [_, ...]  // at least one query

	formulas?: [...#FormulaEntry]
	joins?:    [...#JoinEntry]
	traceOperators?: [...#TraceOperatorEntry]
}

// A query within a composite. Same shape as SigNozBuilderQuery.
#CompositeQueryEntry: #SigNozBuilderQuery

// A formula referencing other queries by name.
#FormulaEntry: {
	name:       #QueryName
	expression: string & !=""  // e.g. "A/B * 100"

	disabled?: bool | *false

	order?:     [...#OrderBy]
	limit?:     int & >=0 & <=10000
	having?:    #Having
	functions?: [...#PostProcessingFunction]
	legend?:    string
}

// A join combining results from two queries.
#JoinEntry: {
	name: #QueryName

	disabled?: bool | *false

	left:     #QueryRef
	right:    #QueryRef
	joinType: "inner" | "left" | "right" | "full" | "cross"
	on:       string & !=""  // join condition expression

	aggregations?:  [...#MetricAggregation | #ExpressionAggregation]
	selectFields?:  [...#TelemetryFieldKey]
	filter?:        #Filter
	groupBy?:       [...#GroupByKey]
	having?:        #Having
	order?:         [...#OrderBy]
	limit?:         int & >=0 & <=10000

	secondaryAggregations?: [...#SecondaryAggregation]
	functions?: [...#PostProcessingFunction]
}

// A trace operator expressing span relationships.
#TraceOperatorEntry: {
	name: #QueryName

	disabled?: bool | *false

	// Operators: => (direct descendant), -> (indirect descendant),
	// && (AND), || (OR), NOT (exclude). Example: "A => B && C"
	expression: string & !=""

	filter?:         #Filter
	returnSpansFrom?: string

	order?:     [...#TraceOrderBy]
	aggregations?: [...#ExpressionAggregation]
	stepInterval?: #StepInterval
	groupBy?:   [...#GroupByKey]
	having?:    #Having
	limit?:     int & >=0 & <=10000
	offset?:    int & >=0
	cursor?:    string
	legend?:    string
	selectFields?: [...#TelemetryFieldKey]
	functions?: [...#PostProcessingFunction]
}

// SigNozPromQL wraps a raw PromQL query.
// Used inside: TimeSeriesQuery.spec.plugin { kind: "SigNozPromQL", spec: ... }
#SigNozPromQL: {
	name:  string
	query: string & !=""

	disabled?: bool | *false
	step?:     #StepInterval
	stats?:    bool | *false
	legend?:   string
}

// SigNozClickHouseSQL wraps a raw ClickHouse SQL query.
// Used inside: TimeSeriesQuery.spec.plugin { kind: "SigNozClickHouseSQL", spec: ... }
#SigNozClickHouseSQL: {
	name:  string
	query: string & !=""

	disabled?: bool | *false
	legend?:   string
}

// ============================================================================
// Variable Plugins
// ============================================================================

// SigNozQueryVariable resolves variable values using a builder query.
// Used inside: ListVariable.spec.plugin { kind: "SigNozQueryVariable", spec: ... }
#SigNozQueryVariable: {
	// The query that produces variable values.
	// Uses the same builder query model as panels.
	query: #SigNozBuilderQuery | #SigNozCompositeQuery | #SigNozPromQL | #SigNozClickHouseSQL
}

// SigNozAttributeValues resolves variable values from attribute autocomplete.
// Used inside: ListVariable.spec.plugin { kind: "SigNozAttributeValues", spec: ... }
// This is a simpler alternative to SigNozQueryVariable for common cases
// like "list all values of host.name for metric X".
#SigNozAttributeValues: {
	signal:        #Signal
	metricName?:   string  // required when signal is "metrics"
	attributeName: string & !=""

	filter?: #Filter  // optional pre-filter
}

// ============================================================================
// Signals
// ============================================================================

#Signal: "metrics" | "traces" | "logs"
// Extensible to "events" | "profiles" in future

// ============================================================================
// Aggregations
// ============================================================================

// MetricAggregation defines the two-level aggregation model for metrics:
// time aggregation (within each time bucket) then space aggregation (across dimensions).
#MetricAggregation: {
	metricName: string & !=""

	temporality?:      #MetricTemporality
	timeAggregation?:  #TimeAggregation
	spaceAggregation?: #SpaceAggregation
	reduceTo?:         #ReduceTo
}

// ExpressionAggregation uses ClickHouse aggregate function syntax for traces/logs.
// Examples: "count()", "sum(item_price)", "p99(duration_nano)", "countIf(day > 10)"
#ExpressionAggregation: {
	expression: string & !=""
	alias?:     string
}

#MetricTemporality: "delta" | "cumulative" | "unspecified"

#TimeAggregation:
	"latest" | "sum" | "avg" | "min" | "max" |
	"count" | "count_distinct" | "rate" | "increase"

#SpaceAggregation:
	"sum" | "avg" | "min" | "max" | "count" |
	"p50" | "p75" | "p90" | "p95" | "p99"

#ReduceTo: "sum" | "count" | "avg" | "min" | "max" | "last" | "median"

// ============================================================================
// Filters
// ============================================================================

// Filter uses expression syntax instead of structured items with synthetic IDs.
// Supports: =, !=, >, >=, <, <=, IN, NOT IN, LIKE, NOT LIKE, ILIKE, NOT ILIKE,
// BETWEEN, NOT BETWEEN, EXISTS, NOT EXISTS, REGEXP, NOT REGEXP, CONTAINS, NOT CONTAINS.
// Variable interpolation: $variable_name
#Filter: {
	expression: string
}

// ============================================================================
// Group By, Order By, Having
// ============================================================================

#GroupByKey: {
	name:           string & !=""
	signal?:        #Signal
	fieldContext?:  #FieldContext
	fieldDataType?: #FieldDataType
}

#OrderBy: {
	key:       #OrderByKey
	direction: "asc" | "desc"
}

#OrderByKey: {
	name:           string & !=""
	signal?:        #Signal
	fieldContext?:  #FieldContext
	fieldDataType?: #FieldDataType
}

#TraceOrderBy: {
	key: {
		name: "span_count" | "trace_duration"
	}
	direction: "asc" | "desc"
}

// Having applies a post-aggregation filter.
// Example: "count() > 100"
#Having: {
	expression: string & !=""
}

// ============================================================================
// Secondary Aggregations & Limits
// ============================================================================

#SecondaryAggregation: {
	expression: string
	alias?:     string

	stepInterval?: #StepInterval
	groupBy?:      [...#GroupByKey]
	order?:        [...#OrderBy]
	limit?:        int & >=0 & <=10000
	limitBy?:      #LimitBy
}

#LimitBy: {
	keys:  [...string] & [_, ...]  // at least one key
	value: string  // max rows per group (string for compatibility)
}

// ============================================================================
// Post-Processing Functions
// ============================================================================

#PostProcessingFunction: {
	name: #FunctionName
	args?: [...#FunctionArg]
}

#FunctionName:
	// Threshold functions
	"cutOffMin" | "cutOffMax" | "clampMin" | "clampMax" |
	// Math functions
	"absolute" | "runningDiff" | "log2" | "log10" | "cumulativeSum" |
	// Smoothing functions (exponentially weighted moving average)
	"ewma3" | "ewma5" | "ewma7" |
	// Smoothing functions (sliding median window)
	"median3" | "median5" | "median7" |
	// Time functions
	"timeShift" |
	// Analysis functions
	"anomaly" |
	// Gap filling
	"fillZero"

#FunctionArg: {
	name?:  string
	value:  number | string | bool
}

// ============================================================================
// Telemetry Field References
// ============================================================================

#TelemetryFieldKey: {
	name:           string & !=""
	description?:   string
	unit?:          string
	signal?:        #Signal
	fieldContext?:  #FieldContext
	fieldDataType?: #FieldDataType
}

#FieldContext:
	"resource" | "scope" | "span" | "event" | "link" |
	"log" | "metric" | "body" | "trace"

#FieldDataType:
	"string" | "int64" | "float64" | "bool" |
	"array(string)" | "array(int64)" | "array(float64)" | "array(bool)"

// ============================================================================
// Common Types
// ============================================================================

// QueryName must be a valid identifier: starts with letter, contains letters/digits/underscores.
#QueryName: =~"^[A-Za-z][A-Za-z0-9_]*$"

// QueryRef references another query by name within a composite query.
#QueryRef: {
	name: string & !=""
}

// StepInterval accepts seconds (numeric) or duration string ("15s", "1m", "1h").
#StepInterval: number & >=0 | =~"^[0-9]+(ns|us|ms|s|m|h)$"
