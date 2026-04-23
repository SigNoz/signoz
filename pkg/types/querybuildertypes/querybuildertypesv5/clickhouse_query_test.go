package querybuildertypesv5

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestClickHouseQuery_Copy(t *testing.T) {
	q := ClickHouseQuery{Name: "A", Query: "SELECT 1", Disabled: true, Legend: "my legend"}
	got := q.Copy()
	if got != q {
		t.Errorf("Copy() = %+v, want %+v", got, q)
	}
}

// TestClickHouseQuery_Validate_DeprecatedTables covers every deprecated table entry,
// verifying both rejection and the correct error message (with or without a replacement hint).
func TestClickHouseQuery_Validate_DeprecatedTables(t *testing.T) {
	tests := []struct {
		table      string
		query      string
		wantErrMsg string // substring expected in error
	}{
		// Traces V2 → V3 (distributed)
		{
			"distributed_signoz_index_v2",
			"SELECT * FROM distributed_signoz_index_v2 LIMIT 10",
			`use "distributed_signoz_index_v3"`,
		},
		{
			"distributed_signoz_spans",
			"SELECT * FROM distributed_signoz_spans",
			`table "distributed_signoz_spans" is deprecated`,
		},
		// Traces V2 → V3 (local)
		{
			"signoz_index_v2",
			"SELECT * FROM signoz_index_v2",
			`use "distributed_signoz_index_v3"`,
		},
		{
			"signoz_spans",
			"SELECT * FROM signoz_spans LIMIT 10",
			`table "signoz_spans" is deprecated`,
		},
		// Dependency graph V1 → V2
		{
			"distributed_dependency_graph_minutes",
			"SELECT * FROM distributed_dependency_graph_minutes",
			`use "distributed_dependency_graph_minutes_v2"`,
		},
		{
			"dependency_graph_minutes",
			"SELECT * FROM dependency_graph_minutes",
			`use "distributed_dependency_graph_minutes_v2"`,
		},
		// Logs V1 → V2
		{
			"distributed_logs",
			"SELECT * FROM signoz_logs.distributed_logs WHERE timestamp > now() - INTERVAL 1 HOUR",
			`use "distributed_logs_v2"`,
		},
		{
			"logs",
			"SELECT body FROM logs LIMIT 100",
			`use "distributed_logs_v2"`,
		},
		// Tag attributes V1 → V2
		{
			"distributed_tag_attributes",
			"SELECT * FROM distributed_tag_attributes",
			`use "distributed_tag_attributes_v2"`,
		},
		{
			"tag_attributes",
			"SELECT * FROM tag_attributes",
			`use "distributed_tag_attributes_v2"`,
		},
		// Metrics V2 → V4
		{
			"distributed_samples_v2",
			"SELECT * FROM distributed_samples_v2",
			`use "distributed_samples_v4"`,
		},
		{
			"samples_v2",
			"SELECT * FROM samples_v2",
			`use "distributed_samples_v4"`,
		},
		{
			"distributed_time_series_v2",
			"SELECT * FROM distributed_time_series_v2",
			`use "distributed_time_series_v4"`,
		},
		{
			"time_series_v2",
			"SELECT * FROM time_series_v2",
			`use "distributed_time_series_v4"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.table, func(t *testing.T) {
			q := ClickHouseQuery{Name: "A", Query: tt.query}
			err := q.Validate()
			if err == nil {
				t.Fatalf("Validate() expected error for deprecated table %q but got none", tt.table)
			}
			_, _, _, _, _, additional := errors.Unwrapb(err)
			combined := strings.Join(additional, "\n")
			if !contains(combined, tt.wantErrMsg) {
				t.Errorf("Validate() additional = %q, want to contain %q", combined, tt.wantErrMsg)
			}
		})
	}
}

// TestClickHouseQuery_LocalTableUsageWarning covers every local-table entry,
// verifying that Validate() passes but LocalTableUsageWarning() returns the
// correct "use distributed table X instead" message.
func TestClickHouseQuery_LocalTableUsageWarning(t *testing.T) {
	tests := []struct {
		table string
		query string
		dist  string // expected distributed replacement in warning
	}{
		// Traces
		{"signoz_error_index_v2", "SELECT * FROM signoz_error_index_v2", "distributed_signoz_error_index_v2"},
		{"signoz_index_v3", "SELECT * FROM signoz_index_v3", "distributed_signoz_index_v3"},
		{"tag_attributes_v2", "SELECT * FROM tag_attributes_v2", "distributed_tag_attributes_v2"},
		// Logs
		{"logs_v2", "SELECT body FROM logs_v2 LIMIT 50", "distributed_logs_v2"},
		{"logs_v2_resource", "SELECT * FROM logs_v2_resource", "distributed_logs_v2_resource"},
		// Metadata
		{"attributes_metadata", "SELECT * FROM attributes_metadata", "distributed_attributes_metadata"},
	}

	for _, tt := range tests {
		t.Run(tt.table, func(t *testing.T) {
			q := ClickHouseQuery{Name: "A", Query: tt.query}
			if err := q.Validate(); err != nil {
				t.Fatalf("Validate() unexpected error for local table %q: %v", tt.table, err)
			}
			warning := q.LocalTableUsageWarning()
			if warning == "" {
				t.Fatalf("LocalTableUsageWarning() expected warning for local table %q but got none", tt.table)
			}
			wantFragment := `use distributed table "` + tt.dist + `"`
			if !contains(warning, wantFragment) {
				t.Errorf("LocalTableUsageWarning() = %q, want to contain %q", warning, wantFragment)
			}
		})
	}
}

// TestClickHouseQuery_Validate_CaseInsensitive verifies that deprecated table
// pattern matching is case-insensitive and returns an error.
func TestClickHouseQuery_Validate_CaseInsensitive(t *testing.T) {
	tests := []struct {
		name  string
		query string
	}{
		{"deprecated table uppercase", "SELECT * FROM DISTRIBUTED_SIGNOZ_INDEX_V2"},
		{"deprecated table mixed case", "SELECT * FROM Distributed_SignoZ_Index_V2"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := (ClickHouseQuery{Name: "A", Query: tt.query}).Validate()
			if err == nil {
				t.Errorf("Validate() expected error for %q but got none", tt.query)
			}
		})
	}
}

// TestClickHouseQuery_LocalTableUsageWarning_CaseInsensitive verifies that local
// table pattern matching is case-insensitive and returns a warning.
func TestClickHouseQuery_LocalTableUsageWarning_CaseInsensitive(t *testing.T) {
	tests := []struct {
		name  string
		query string
	}{
		{"local table uppercase", "SELECT * FROM LOGS_V2"},
		{"local table mixed case", "SELECT * FROM Signoz_Index_V3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := ClickHouseQuery{Name: "A", Query: tt.query}
			if err := q.Validate(); err != nil {
				t.Errorf("Validate() unexpected error for %q: %v", tt.query, err)
			}
			if q.LocalTableUsageWarning() == "" {
				t.Errorf("LocalTableUsageWarning() expected warning for %q but got none", tt.query)
			}
		})
	}
}
