package ingest

import (
	"encoding/hex"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// placeholders counts the bind markers in an INSERT column contract. The
// column-contract tests assert every builder emits exactly this many args, so a
// future column add/drop that is not mirrored in the builder fails here.
func placeholders(columns string) int { return strings.Count(columns, "?") }

func newTestTraces() ptrace.Traces {
	tr := ptrace.NewTraces()
	rs := tr.ResourceSpans().AppendEmpty()
	rs.SetSchemaUrl("rs-url")
	attrs := rs.Resource().Attributes()
	attrs.PutStr("service.name", "svc-a")
	attrs.PutStr("space_id", "client-space") // must lose to the trusted stamp
	attrs.PutStr("aivision.space.id", "trusted-space")
	attrs.PutStr("aivision.user.id", "user-1")
	attrs.PutStr("run_id", "run-1")
	ss := rs.ScopeSpans().AppendEmpty()
	ss.SetSchemaUrl("ss-url")
	ss.Scope().SetName("scope-a")
	ss.Scope().SetVersion("v1")
	span := ss.Spans().AppendEmpty()
	var tid pcommon.TraceID
	copy(tid[:], []byte{0xaa, 0xbb, 0xcc, 0xdd, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x11})
	span.SetTraceID(tid)
	var sid pcommon.SpanID
	copy(sid[:], []byte{1, 2, 3, 4, 5, 6, 7, 8})
	span.SetSpanID(sid)
	span.SetName("op")
	span.SetKind(ptrace.SpanKindServer)
	span.SetStartTimestamp(1000)
	span.SetEndTimestamp(3000)
	span.Status().SetCode(ptrace.StatusCodeOk)
	span.Attributes().PutStr("agent.product", "prod-a")
	return tr
}

func TestBuildSpanRowsGolden(t *testing.T) {
	rows, err := buildSpanRows(newTestTraces(), "org-cfg")
	if err != nil {
		t.Fatalf("buildSpanRows: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("row count = %d, want 1", len(rows))
	}
	row := rows[0]
	if len(row) != placeholders(spanInsertColumns) {
		t.Fatalf("span row has %d args, contract has %d placeholders", len(row), placeholders(spanInsertColumns))
	}
	var tid pcommon.TraceID
	copy(tid[:], []byte{0xaa, 0xbb, 0xcc, 0xdd, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x11})
	var sid pcommon.SpanID
	copy(sid[:], []byte{1, 2, 3, 4, 5, 6, 7, 8})
	checks := []struct {
		index int
		name  string
		want  any
	}{
		{0, "org_id", "org-cfg"},         // config-authoritative org
		{1, "space_id", "trusted-space"}, // gateway stamp beats client attr
		{3, "trace_id", hex.EncodeToString(tid[:])},
		{4, "span_id", hex.EncodeToString(sid[:])},
		{5, "parent_span_id", ""},
		{8, "span_name", "op"},
		{9, "span_kind", "Server"},
		{10, "service_name", "svc-a"},
		{11, "start_time_unix_nano", "1000"},
		{12, "end_time_unix_nano", "3000"},
		{13, "duration_nano", "2000"},
		{14, "status_code", int16(ptrace.StatusCodeOk)},
		{16, "resource_schema_url", "rs-url"},
		{17, "scope_schema_url", "ss-url"},
		{18, "scope_name", "scope-a"},
		{19, "scope_version", "v1"},
		{26, "run_id", "run-1"},
		{28, "user_id", "user-1"},
		{29, "agent_product", "prod-a"},
		{30, "agent_name", "svc-a"}, // falls back to service.name
	}
	for _, c := range checks {
		if row[c.index] != c.want {
			t.Errorf("span column %d (%s) = %#v, want %#v", c.index, c.name, row[c.index], c.want)
		}
	}
}

func newTestLogs() plog.Logs {
	lg := plog.NewLogs()
	rl := lg.ResourceLogs().AppendEmpty()
	rl.Resource().Attributes().PutStr("service.name", "svc-l")
	rl.Resource().Attributes().PutStr("aivision.space.id", "space-l")
	sl := rl.ScopeLogs().AppendEmpty()
	sl.Scope().SetName("scope-l")
	rec := sl.LogRecords().AppendEmpty()
	rec.SetTimestamp(5000)
	rec.SetObservedTimestamp(6000)
	rec.SetSeverityNumber(plog.SeverityNumberError)
	rec.SetSeverityText("ERROR")
	rec.Body().SetStr("boom")
	rec.Attributes().PutStr("log.record.uid", "uid-1")
	return lg
}

func TestBuildLogRowsGolden(t *testing.T) {
	rows, err := buildLogRows(newTestLogs(), "org-cfg")
	if err != nil {
		t.Fatalf("buildLogRows: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("row count = %d, want 1", len(rows))
	}
	row := rows[0]
	if len(row) != placeholders(logInsertColumns) {
		t.Fatalf("log row has %d args, contract has %d placeholders", len(row), placeholders(logInsertColumns))
	}
	checks := []struct {
		index int
		name  string
		want  any
	}{
		{0, "org_id", "org-cfg"},
		{1, "space_id", "space-l"},
		{2, "log_id", digest("uid-1")}, // stable id from log.record.uid
		{3, "timestamp", "5000"},
		{5, "observed_time_unix_nano", "6000"},
		{9, "severity_number", int16(plog.SeverityNumberError)},
		{10, "severity_text", "ERROR"},
		{13, "body_text", "boom"},
		{16, "service_name", "svc-l"},
	}
	for _, c := range checks {
		if row[c.index] != c.want {
			t.Errorf("log column %d (%s) = %#v, want %#v", c.index, c.name, row[c.index], c.want)
		}
	}
}

func newTestMetrics() pmetric.Metrics {
	mt := pmetric.NewMetrics()
	rm := mt.ResourceMetrics().AppendEmpty()
	rm.Resource().Attributes().PutStr("service.name", "svc-m")
	rm.Resource().Attributes().PutStr("aivision.space.id", "space-m")
	sm := rm.ScopeMetrics().AppendEmpty()
	sm.Scope().SetName("scope-m")
	m := sm.Metrics().AppendEmpty()
	m.SetName("cpu")
	m.SetUnit("1")
	m.SetDescription("desc")
	dp := m.SetEmptyGauge().DataPoints().AppendEmpty()
	dp.SetTimestamp(7000)
	dp.SetStartTimestamp(6500)
	dp.SetIntValue(42)
	return mt
}

func TestBuildMetricRowsGolden(t *testing.T) {
	rows, err := buildMetricRows(newTestMetrics(), "org-cfg")
	if err != nil {
		t.Fatalf("buildMetricRows: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("row count = %d, want 1", len(rows))
	}
	row := rows[0]
	if len(row) != placeholders(metricInsertColumns) {
		t.Fatalf("metric row has %d args, contract has %d placeholders", len(row), placeholders(metricInsertColumns))
	}
	checks := []struct {
		index int
		name  string
		want  any
	}{
		{0, "org_id", "org-cfg"},
		{1, "space_id", "space-m"},
		{3, "metric_name", "cpu"},
		{4, "metric_type", "gauge"},
		{5, "description", "desc"},
		{6, "unit", "1"},
		{7, "timestamp", "7000"},
		{9, "start_time_unix_nano", "6500"},
		{10, "value", int64(42)},
		{20, "service_name", "svc-m"},
	}
	for _, c := range checks {
		if row[c.index] != c.want {
			t.Errorf("metric column %d (%s) = %#v, want %#v", c.index, c.name, row[c.index], c.want)
		}
	}
	if row[2] == "" {
		t.Errorf("metric sample_id must be a non-empty digest")
	}
}

// TestExtractCorrelationTrustedOverride pins the security-relevant rule: a
// client-supplied space/user attribute never beats the gateway's trusted stamp.
func TestExtractCorrelationTrustedOverride(t *testing.T) {
	resource := pcommon.NewMap()
	resource.PutStr("space_id", "client-space")
	resource.PutStr("user_id", "client-user")
	resource.PutStr("aivision.space.id", "trusted-space")
	resource.PutStr("aivision.user.id", "trusted-user")
	c := extractCorrelation(resource, pcommon.NewMap(), "org-cfg")
	if c.spaceID != "trusted-space" {
		t.Errorf("spaceID = %q, want trusted-space", c.spaceID)
	}
	if c.userID != "trusted-user" {
		t.Errorf("userID = %q, want trusted-user", c.userID)
	}
	if c.orgID != "org-cfg" {
		t.Errorf("orgID = %q, want org-cfg", c.orgID)
	}
}

func TestAddToRouterDisabledWithoutKey(t *testing.T) {
	r := mux.NewRouter()
	if err := AddToRouter(r, Config{DSN: "x", TablePrefix: "signoz"}, testLogger()); err != nil {
		t.Fatalf("AddToRouter with empty key must be a no-op, got %v", err)
	}
	if n := countRoutes(r); n != 0 {
		t.Fatalf("disabled endpoint registered %d routes, want 0", n)
	}
}

func TestAddToRouterRejectsBadPrefix(t *testing.T) {
	r := mux.NewRouter()
	err := AddToRouter(r, Config{DSN: "x", TablePrefix: "bad;prefix", InternalKey: "k"}, testLogger())
	if err == nil {
		t.Fatal("AddToRouter must reject an unsafe table_prefix")
	}
	if !strings.Contains(err.Error(), "table_prefix") {
		t.Fatalf("error %v should mention table_prefix", err)
	}
}

func countRoutes(r *mux.Router) int {
	n := 0
	_ = r.Walk(func(*mux.Route, *mux.Router, []*mux.Route) error {
		n++
		return nil
	})
	return n
}
