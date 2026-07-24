package dashboardtypes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// migrateOutcome classifies how far a v1 fixture gets through the migration
// pipeline: convert (ConvertV1ToV2) → readback (JSON round-trip, which populates
// derived fields like JSONRef.Path and runs struct-tag validation) → validate
// (DashboardSpec.Validate). Production stores the converted JSON and re-reads it,
// so readback + validate mirror what a real import hits.
const (
	outcomeOK           = "ok"
	outcomeConvertFail  = "convert-fail"  // ConvertV1ToV2 returned an error (widget skipped-and-noted, panic, …)
	outcomeReadbackFail = "readback-fail" // converted JSON fails to unmarshal/validate on read (e.g. required field empty)
	outcomeValidateFail = "validate-fail" // DashboardSpec.Validate rejected the converted dashboard
)

// expectedFixtureOutcomes records the migration outcome of every fixture under
// testdata/malformed_v1. Adding a fixture without an entry here fails the test,
// keeping the hand-testing corpus and its recorded "expected v2" in sync.
//
// NOTE: outcomeOK means "migrates and validates without error" — NOT necessarily
// "renders correct data"; behavioural correctness is verified in the v2 UI, which
// is the point of this corpus. (Aggregation correctness for the flat-shape cases,
// 04/05, is additionally asserted by the RebuildsFlat*Aggregation unit tests.)
var expectedFixtureOutcomes = map[string]string{
	"01_having_array.json":                               outcomeOK,
	"02_filters_items_deprecated_ops.json":               outcomeOK,
	"03_logs_agg_expression_messy.json":                  outcomeOK,
	"04_flat_metric_aggregation.json":                    outcomeOK,
	"05_flat_logs_aggregation.json":                      outcomeOK,
	"06_pagesize_to_limit.json":                          outcomeOK,
	"07_trace_list_old_field_keys.json":                  outcomeOK,
	"08_old_field_keys_list_panel.json":                  outcomeOK,
	"09_variable_dynamic_missing_attribute.json":         outcomeOK,
	"10_layout_duplicate_i.json":                         outcomeOK,
	"11_layout_orphan_entries.json":                      outcomeOK,
	"12_layout_collapsed_ghost_child_bare_panelmap.json": outcomeOK,
	"13_unrenderable_widget_type.json":                   outcomeConvertFail,
	"14_layout_overlapping.json":                         outcomeOK,
}

// TestMalformedV1FixturesMigrate migrates every fixture under testdata/malformed_v1
// through the full pipeline and asserts the recorded outcome, so the corpus stays
// a live regression guard alongside the manual v1/v2 UI comparison. Run with -v to
// see the per-fixture summary.
func TestMalformedV1FixturesMigrate(t *testing.T) {
	files, err := filepath.Glob("testdata/malformed_v1/*.json")
	require.NoError(t, err)
	require.NotEmpty(t, files)
	sort.Strings(files)

	for _, f := range files {
		name := filepath.Base(f)
		raw, err := os.ReadFile(f)
		require.NoError(t, err, name)
		var data StorableDashboardData
		require.NoError(t, json.Unmarshal(raw, &data), name)

		outcome, detail := migrateFixture(t, data)
		t.Logf("%-52s %s %s", name, outcome, detail)

		want, listed := expectedFixtureOutcomes[name]
		if assert.Truef(t, listed, "%s has no expectedFixtureOutcomes entry", name) {
			assert.Equalf(t, want, outcome, "%s outcome changed (detail: %s)", name, detail)
		}
	}
}

func migrateFixture(t *testing.T, data StorableDashboardData) (outcome, detail string) {
	t.Helper()
	v2, convErr := (StorableDashboard{Data: data}).ConvertV1ToV2()
	if convErr != nil {
		return outcomeConvertFail, convErr.Error()
	}
	out, err := json.Marshal(v2.Spec)
	require.NoError(t, err)
	var spec DashboardSpec
	if err := json.Unmarshal(out, &spec); err != nil {
		return outcomeReadbackFail, err.Error()
	}
	if err := spec.Validate(); err != nil {
		return outcomeValidateFail, err.Error()
	}
	return outcomeOK, "panels=" + strconv.Itoa(len(spec.Panels)) + " layouts=" + strconv.Itoa(len(spec.Layouts)) + " vars=" + strconv.Itoa(len(spec.Variables))
}
