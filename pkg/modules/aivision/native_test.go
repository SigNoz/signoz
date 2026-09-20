package aivision

import (
	"reflect"
	"strings"
	"testing"
)

func TestNormalizeNativeSpanMatchesAIVisionShape(t *testing.T) {
	row := map[string]any{
		"start_time_unix_nano": int64(1_788_931_701_938_694_445),
		"end_time_unix_nano":   int64(1_788_931_702_288_694_445),
		"status_code":          int64(2),
		"status_message":       "failed",
		"kind":                 "Client",
		"events": []any{map[string]any{
			"name":                "checkpoint",
			"timestamp_unix_nano": "1788931701948694445",
		}},
	}

	normalizeNativeSpan(row)

	assertEqual(t, "start timestamp", row["start_time_unix_nano"], "2026-09-09T05:28:21.938694445Z")
	assertEqual(t, "end timestamp", row["end_time_unix_nano"], "2026-09-09T05:28:22.288694445Z")
	assertEqual(t, "kind", row["kind"], "3")
	assertEqual(t, "status", row["status"], map[string]any{"code": "ERROR", "message": "failed"})
	if _, exists := row["status_code"]; exists {
		t.Fatal("status_code must be folded into status")
	}
	event := row["events"].([]any)[0].(map[string]any)
	assertEqual(t, "event timestamp", event["time_unix_nano"], "2026-09-09T05:28:21.948694445Z")
	if _, exists := event["timestamp_unix_nano"]; exists {
		t.Fatal("timestamp_unix_nano must be renamed to time_unix_nano")
	}
}

func TestNativeTraceWhereSupportsAIVisionFilters(t *testing.T) {
	params := nativeListParams{
		From:         1_700_000_000_000,
		To:           1_700_003_600_000,
		SpaceID:      "space-7",
		AgentProduct: "Codex",
		TraceIDs:     []string{"trace-1", "trace-2"},
		Filters: []nativeFilter{
			{Field: "resource.attributes.ant.agent.env", Op: "=", Value: "prod"},
			{Field: "attributes.ant.username", Op: "in", Value: []any{"alice", "bob"}},
		},
		Tags:         []string{"sdk"},
		InputKeyword: "needle' OR 1=1 --",
	}

	where, args, err := nativeTraceWhere("org-7", params)
	if err != nil {
		t.Fatal(err)
	}
	for _, fragment := range []string{
		"org_id = ?",
		"space_id = ?",
		"agent_product = ?",
		"trace_id IN (?,?)",
		"JSON_EXTRACT(resource_attributes",
		"JSON_EXTRACT(attributes",
		"LIKE ?",
	} {
		if !strings.Contains(where, fragment) {
			t.Fatalf("where clause %q does not contain %q", where, fragment)
		}
	}
	if strings.Contains(where, params.InputKeyword) {
		t.Fatalf("input keyword was interpolated into SQL: %s", where)
	}
	if len(args) < 12 || args[0] != "org-7" || args[3] != "space-7" {
		t.Fatalf("unexpected bound args: %#v", args)
	}
	if args[len(args)-2] != "%needle' OR 1=1 --%" || args[len(args)-1] != "%needle' OR 1=1 --%" {
		t.Fatalf("input keyword must be parameterized twice: %#v", args)
	}
}

func TestNativeTraceWhereRequiresSpaceID(t *testing.T) {
	_, _, err := nativeTraceWhere("org-7", nativeListParams{
		From: 1_700_000_000_000,
		To:   1_700_003_600_000,
	})
	if err == nil || !strings.Contains(err.Error(), "space_id is required") {
		t.Fatalf("error = %v, want required space_id", err)
	}
}

func TestNativeTraceIDInFilterUsesBoundValues(t *testing.T) {
	clause, args, err := compileNativeFilter(nativeFilter{
		Field: "trace_id",
		Op:    "in",
		Value: []any{"trace-1", "trace-2' OR 1=1 --"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if clause != "trace_id IN (?,?)" {
		t.Fatalf("clause = %q", clause)
	}
	if !reflect.DeepEqual(args, []any{"trace-1", "trace-2' OR 1=1 --"}) {
		t.Fatalf("args = %#v", args)
	}
}

func TestNativeOrderByIsAllowlisted(t *testing.T) {
	if got := nativeTraceOrderBy("start_time_unix_nano.asc"); got != "start_time_unix_nano ASC" {
		t.Fatalf("valid order = %q", got)
	}
	if got := nativeTraceOrderBy("start_time_unix_nano.desc; DROP TABLE traces"); got != "start_time_unix_nano DESC" {
		t.Fatalf("unsafe order must fall back, got %q", got)
	}
	if got := nativeSessionOrderBy("trace_count.asc"); got != "trace_count ASC" {
		t.Fatalf("session order = %q", got)
	}
}

func TestDecodeNativeTags(t *testing.T) {
	want := []string{"sdk", "agent"}
	if got := decodeNativeTags(`["sdk", "agent"]`); !reflect.DeepEqual(got, want) {
		t.Fatalf("decoded tags = %#v, want %#v", got, want)
	}
}

func assertEqual(t *testing.T, label string, got, want any) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("%s: got %#v, want %#v", label, got, want)
	}
}
