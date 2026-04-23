package querybuildertypesv5

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

type chTableCheck struct {
	pattern *regexp.Regexp
	errMsg  string
}

func buildDeprecatedChecks(entries []struct{ name, replacement string }) []chTableCheck {
	result := make([]chTableCheck, len(entries))
	for i, e := range entries {
		var msg string
		if e.replacement != "" {
			msg = fmt.Sprintf("table %q is deprecated, use %q instead", e.name, e.replacement)
		} else {
			msg = fmt.Sprintf("table %q is deprecated", e.name)
		}
		result[i] = chTableCheck{
			pattern: regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(e.name) + `\b`),
			errMsg:  msg,
		}
	}
	return result
}

func buildLocalChecks(entries []struct{ name, replacement string }) []chTableCheck {
	result := make([]chTableCheck, len(entries))
	for i, e := range entries {
		result[i] = chTableCheck{
			pattern: regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(e.name) + `\b`),
			errMsg:  fmt.Sprintf("ClickHouse query references local table %q, use distributed table %q instead", e.name, e.replacement),
		}
	}
	return result
}

// chDeprecatedChecks contains checks for deprecated tables; matching queries
// are rejected with an error. Word-boundary patterns prevent false positives
// (e.g. "distributed_logs" must not match "distributed_logs_v2").
var chDeprecatedChecks = buildDeprecatedChecks([]struct{ name, replacement string }{
	// Traces V2 → V3
	{"distributed_signoz_index_v2", "distributed_signoz_index_v3"},
	{"signoz_index_v2", "distributed_signoz_index_v3"},
	{"distributed_durationSort", "distributed_signoz_index_v3"},
	{"durationSort", "distributed_signoz_index_v3"},
	{"distributed_signoz_spans", "distributed_signoz_index_v3"},
	{"signoz_spans", "distributed_signoz_index_v3"},
	// Dependency graph V1 → V2 (dropped in migration 1003)
	{"distributed_dependency_graph_minutes", "distributed_dependency_graph_minutes_v2"},
	{"dependency_graph_minutes", "distributed_dependency_graph_minutes_v2"},
	// Logs V1 → V2
	{"distributed_logs", "distributed_logs_v2"},
	{"logs", "distributed_logs_v2"},
	// Tag attributes V1 → V2
	{"distributed_tag_attributes", "distributed_tag_attributes_v2"},
	{"tag_attributes", "distributed_tag_attributes_v2"},
	// Metrics V2 → V4 (no v3 exists)
	{"distributed_samples_v2", "distributed_samples_v4"},
	{"samples_v2", "distributed_samples_v4"},
	{"distributed_time_series_v2", "distributed_time_series_v4"},
	{"time_series_v2", "distributed_time_series_v4"},
})

// chLocalChecks contains checks for local (non-distributed) tables; matching
// queries produce a warning rather than an error.
// Note: metric & meter local tables (samples_v4, time_series_v4, samples, etc.)
// are intentionally omitted — SigNoz metric queries correctly use local tables
// by design (see https://signoz.io/docs/userguide/write-a-metrics-clickhouse-query/).
var chLocalChecks = buildLocalChecks([]struct{ name, replacement string }{
	// Traces
	{"dependency_graph_minutes_v2", "distributed_dependency_graph_minutes_v2"},
	{"signoz_error_index_v2", "distributed_signoz_error_index_v2"},
	{"signoz_index_v3", "distributed_signoz_index_v3"},
	{"span_attributes", "distributed_span_attributes"},
	{"span_attributes_keys", "distributed_span_attributes_keys"},
	{"tag_attributes_v2", "distributed_tag_attributes_v2"},
	{"top_level_operations", "distributed_top_level_operations"},
	{"trace_summary", "distributed_trace_summary"},
	{"traces_v3_resource", "distributed_traces_v3_resource"},
	{"usage", "distributed_usage"},
	{"usage_explorer", "distributed_usage_explorer"},
	// Logs
	{"logs_attribute_keys", "distributed_logs_attribute_keys"},
	{"logs_resource_keys", "distributed_logs_resource_keys"},
	{"logs_v2", "distributed_logs_v2"},
	{"logs_v2_resource", "distributed_logs_v2_resource"},
	{"tag_attributes_v2", "distributed_tag_attributes_v2"},
	{"usage", "distributed_usage"},
	// Metrics
	{"samples_v4", "distributed_samples_v4"},
	{"samples_v4_agg_5m", "distributed_samples_v4_agg_5m"},
	{"samples_v4_agg_30m", "distributed_samples_v4_agg_30m"},
	// NOTE: its tricky to determine if usage of time_series_v4 vs distributed_time_series_v4 is correct or not,
	// without understanding the entire SQL. Hence we're skipping them for now.
	// TODO: Develop an intelligent non over-engineered solution for this.
	// {"exp_hist", "distributed_exp_hist"},
	// {"time_series_v4", "distributed_time_series_v4"},
	// {"time_series_v4_6hrs", "distributed_time_series_v4_6hrs"},
	// {"time_series_v4_1day", "distributed_time_series_v4_1day"},
	// {"time_series_v4_1week", "distributed_time_series_v4_1week"},
	{"updated_metadata", "distributed_updated_metadata"},
	{"metadata", "distributed_metadata"},
	{"usage", "distributed_usage"},
	// Meter
	{"samples", "distributed_samples"},
	{"samples_agg_1d", "distributed_samples_agg_1d"},
	// Metadata
	{"attributes_metadata", "distributed_attributes_metadata"},
	{"column_evolution_metadata", "distributed_column_evolution_metadata"},
})

type ClickHouseQuery struct {
	// name of the query
	Name string `json:"name"`
	// query to execute
	Query string `json:"query"`
	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the ClickHouseQuery.
func (q ClickHouseQuery) Copy() ClickHouseQuery {
	return q
}

// Validate performs basic validation on ClickHouseQuery.
// It returns an error for deprecated tables
func (q ClickHouseQuery) Validate() error {
	if q.Name == "" {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"name is required for ClickHouse query",
		)
	}

	if q.Query == "" {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"ClickHouse SQL query is required",
		)
	}

	trimmed := strings.TrimSpace(q.Query)

	var msgs []string
	for _, check := range chDeprecatedChecks {
		if check.pattern.MatchString(trimmed) {
			msgs = append(msgs, check.errMsg)
		}
	}
	if len(msgs) > 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "ClickHouse query references deprecated tables").WithAdditional(msgs...)
	}

	return nil
}

// LocalTableWarnings returns warning messages for any local (non-distributed)
// tables referenced in the query. Unlike deprecated tables, local tables are
// not rejected outright — the query is still executed but the caller should
// surface the warnings to the user.
func (q ClickHouseQuery) LocalTableUsageWarning() string {
	trimmed := strings.TrimSpace(q.Query)
	var warnings []string
	for _, check := range chLocalChecks {
		if check.pattern.MatchString(trimmed) {
			warnings = append(warnings, check.errMsg)
		}
	}
	return strings.Join(warnings, "\n")
}
