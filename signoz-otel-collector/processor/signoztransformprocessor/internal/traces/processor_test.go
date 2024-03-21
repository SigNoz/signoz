// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package traces

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"
)

var (
	TestSpanStartTime      = time.Date(2020, 2, 11, 20, 26, 12, 321, time.UTC)
	TestSpanStartTimestamp = pcommon.NewTimestampFromTime(TestSpanStartTime)

	TestSpanEndTime      = time.Date(2020, 2, 11, 20, 26, 13, 789, time.UTC)
	TestSpanEndTimestamp = pcommon.NewTimestampFromTime(TestSpanEndTime)

	traceID = [16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
	spanID  = [8]byte{1, 2, 3, 4, 5, 6, 7, 8}
	spanID2 = [8]byte{8, 7, 6, 5, 4, 3, 2, 1}
)

func Test_ProcessTraces_ResourceContext(t *testing.T) {
	tests := []struct {
		statement string
		want      func(td ptrace.Traces)
	}{
		{
			statement: `set(attributes["test"], "pass")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).Resource().Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where attributes["host.name"] == "wrong"`,
			want: func(td ptrace.Traces) {
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.statement, func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor([]common.ContextStatements{{Context: "resource", Statements: []string{tt.statement}}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.NoError(t, err)

			exTd := constructTraces()
			tt.want(exTd)

			assert.Equal(t, exTd, td)
		})
	}
}

func Test_ProcessTraces_ScopeContext(t *testing.T) {
	tests := []struct {
		statement string
		want      func(td ptrace.Traces)
	}{
		{
			statement: `set(attributes["test"], "pass") where name == "scope"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Scope().Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where version == 2`,
			want: func(td ptrace.Traces) {
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.statement, func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor([]common.ContextStatements{{Context: "scope", Statements: []string{tt.statement}}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.NoError(t, err)

			exTd := constructTraces()
			tt.want(exTd)

			assert.Equal(t, exTd, td)
		})
	}
}

func Test_ProcessTraces_TraceContext(t *testing.T) {
	tests := []struct {
		statement string
		want      func(td ptrace.Traces)
	}{
		{
			statement: `set(attributes["test"], "pass") where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where resource.attributes["host.name"] == "localhost"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `keep_keys(attributes, ["http.method"]) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().Clear()
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.method", "get")
			},
		},
		{
			statement: `set(status.code, 1) where attributes["http.path"] == "/health"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Status().SetCode(ptrace.StatusCodeOk)
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Status().SetCode(ptrace.StatusCodeOk)
			},
		},
		{
			statement: `set(attributes["test"], "pass") where dropped_attributes_count == 1`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where dropped_events_count == 1`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where dropped_links_count == 1`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where span_id == SpanID(0x0102030405060708)`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where parent_span_id == SpanID(0x0807060504030201)`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where trace_id == TraceID(0x0102030405060708090a0b0c0d0e0f10)`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where trace_state == "new"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `replace_pattern(attributes["http.method"], "get", "post")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.method", "post")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("http.method", "post")
			},
		},
		{
			statement: `replace_all_patterns(attributes, "value", "get", "post")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.method", "post")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("http.method", "post")
			},
		},
		{
			statement: `replace_all_patterns(attributes, "key", "http.url", "url")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().Clear()
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.method", "get")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.path", "/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("url", "http://localhost/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("flags", "A|B|C")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("total.string", "123456789")

				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().Clear()
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("http.method", "get")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("http.path", "/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("url", "http://localhost/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("flags", "C|D")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("total.string", "345678")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where IsMatch(name, "operation[AC]")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where attributes["doesnt exist"] == nil`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `delete_key(attributes, "http.url") where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().Clear()
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.method", "get")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.path", "/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("total.string", "123456789")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("flags", "A|B|C")
			},
		},
		{
			statement: `delete_matching_keys(attributes, "http.*t.*") where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().Clear()
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("http.url", "http://localhost/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("flags", "A|B|C")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("total.string", "123456789")
			},
		},
		{
			statement: `set(attributes["test"], "pass") where kind == SPAN_KIND_INTERNAL`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
			},
		},
		{
			statement: `set(kind, SPAN_KIND_SERVER) where kind == 1`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).SetKind(2)
			},
		},
		{
			statement: `set(attributes["test"], Concat([attributes["http.method"], attributes["http.url"]], ": "))`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "get: http://localhost/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "get: http://localhost/health")
			},
		},
		{
			statement: `set(attributes["test"], Concat([attributes["http.method"], ": ", attributes["http.url"]], ""))`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "get: http://localhost/health")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "get: http://localhost/health")
			},
		},
		{
			statement: `set(attributes["test"], Concat([attributes["http.method"], attributes["http.url"]], ": ")) where name == Concat(["operation", "A"], "")`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "get: http://localhost/health")
			},
		},
		{
			statement: `set(attributes["kind"], Concat(["kind", ": ", kind], "")) where kind == 1`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("kind", "kind: 1")
			},
		},
		{
			statement: `set(attributes["test"], Split(attributes["flags"], "|"))`,
			want: func(td ptrace.Traces) {
				v1 := td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutEmptySlice("test")
				v1.AppendEmpty().SetStr("A")
				v1.AppendEmpty().SetStr("B")
				v1.AppendEmpty().SetStr("C")
				v2 := td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutEmptySlice("test")
				v2.AppendEmpty().SetStr("C")
				v2.AppendEmpty().SetStr("D")
			},
		},
		{
			statement: `set(attributes["test"], Split(attributes["flags"], "|")) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				v1 := td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutEmptySlice("test")
				v1.AppendEmpty().SetStr("A")
				v1.AppendEmpty().SetStr("B")
				v1.AppendEmpty().SetStr("C")
			},
		},
		{
			statement: `set(attributes["test"], Split(attributes["not_exist"], "|"))`,
			want:      func(td ptrace.Traces) {},
		},
		{
			statement: `set(attributes["test"], Substring(attributes["total.string"], 3, 3))`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "456")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "678")
			},
		},
		{
			statement: `set(attributes["test"], Substring(attributes["total.string"], 3, 3)) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "456")
			},
		},
		{
			statement: `set(attributes["test"], Substring(attributes["not_exist"], 3, 3))`,
			want:      func(td ptrace.Traces) {},
		},
		{
			statement: `set(attributes["test"], ["A", "B", "C"]) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				v1 := td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutEmptySlice("test")
				v1.AppendEmpty().SetStr("A")
				v1.AppendEmpty().SetStr("B")
				v1.AppendEmpty().SetStr("C")
			},
		},
		{
			statement: `set(attributes["entrypoint"], name) where parent_span_id == SpanID(0x0000000000000000)`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("entrypoint", "operationB")
			},
		},
		{
			statement: `set(attributes["test"], ConvertCase(name, "lower")) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "operationa")
			},
		},
		{
			statement: `set(attributes["test"], ConvertCase(name, "upper")) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "OPERATIONA")
			},
		},
		{
			statement: `set(attributes["test"], ConvertCase(name, "snake")) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "operation_a")
			},
		},
		{
			statement: `set(attributes["test"], ConvertCase(name, "camel")) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "OperationA")
			},
		},
		{
			statement: `merge_maps(attributes, ParseJSON("{\"json_test\":\"pass\"}"), "insert") where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("json_test", "pass")
			},
		},
		{
			statement: `limit(attributes, 0, []) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().RemoveIf(func(s string, v pcommon.Value) bool { return true })
			},
		},
		{
			statement: `set(attributes["test"], Log(1)) where name == "operationA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutDouble("test", 0.0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.statement, func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor([]common.ContextStatements{{Context: "span", Statements: []string{tt.statement}}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.NoError(t, err)

			exTd := constructTraces()
			tt.want(exTd)

			assert.Equal(t, exTd, td)
		})
	}
}

func Test_ProcessTraces_SpanEventContext(t *testing.T) {
	tests := []struct {
		statement string
		want      func(td ptrace.Traces)
	}{
		{
			statement: `set(attributes["test"], "pass") where name == "eventA"`,
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Events().At(0).Attributes().PutStr("test", "pass")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.statement, func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor([]common.ContextStatements{{Context: "spanevent", Statements: []string{tt.statement}}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.NoError(t, err)

			exTd := constructTraces()
			tt.want(exTd)

			assert.Equal(t, exTd, td)
		})
	}
}

func Test_ProcessTraces_MixContext(t *testing.T) {
	tests := []struct {
		name             string
		contextStatments []common.ContextStatements
		want             func(td ptrace.Traces)
	}{
		{
			name: "set resource and then use",
			contextStatments: []common.ContextStatements{
				{
					Context: "resource",
					Statements: []string{
						`set(attributes["test"], "pass")`,
					},
				},
				{
					Context: "span",
					Statements: []string{
						`set(attributes["test"], "pass") where resource.attributes["test"] == "pass"`,
					},
				},
			},
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).Resource().Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "pass")
			},
		},
		{
			name: "set scope and then use",
			contextStatments: []common.ContextStatements{
				{
					Context: "scope",
					Statements: []string{
						`set(attributes["test"], "pass")`,
					},
				},
				{
					Context: "span",
					Statements: []string{
						`set(attributes["test"], "pass") where instrumentation_scope.attributes["test"] == "pass"`,
					},
				},
			},
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Scope().Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "pass")
			},
		},
		{
			name: "order matters",
			contextStatments: []common.ContextStatements{
				{
					Context: "span",
					Statements: []string{
						`set(attributes["test"], "pass") where instrumentation_scope.attributes["test"] == "pass"`,
					},
				},
				{
					Context: "scope",
					Statements: []string{
						`set(attributes["test"], "pass")`,
					},
				},
			},
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Scope().Attributes().PutStr("test", "pass")
			},
		},
		{
			name: "reuse context",
			contextStatments: []common.ContextStatements{
				{
					Context: "scope",
					Statements: []string{
						`set(attributes["test"], "pass")`,
					},
				},
				{
					Context: "span",
					Statements: []string{
						`set(attributes["test"], "pass") where instrumentation_scope.attributes["test"] == "pass"`,
					},
				},
				{
					Context: "scope",
					Statements: []string{
						`set(attributes["test"], "fail")`,
					},
				},
			},
			want: func(td ptrace.Traces) {
				td.ResourceSpans().At(0).ScopeSpans().At(0).Scope().Attributes().PutStr("test", "fail")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).Attributes().PutStr("test", "pass")
				td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(1).Attributes().PutStr("test", "pass")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor(tt.contextStatments, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.NoError(t, err)

			exTd := constructTraces()
			tt.want(exTd)

			assert.Equal(t, exTd, td)
		})
	}
}

func Test_ProcessTraces_Error(t *testing.T) {
	tests := []struct {
		statement string
		context   common.ContextID
	}{
		{
			context: "resource",
		},
		{
			context: "scope",
		},
		{
			context: "span",
		},
		{
			context: "spanevent",
		},
	}

	for _, tt := range tests {
		t.Run(string(tt.context), func(t *testing.T) {
			td := constructTraces()
			processor, err := NewProcessor([]common.ContextStatements{{Context: tt.context, Statements: []string{`set(attributes["test"], ParseJSON(1))`}}}, ottl.PropagateError, componenttest.NewNopTelemetrySettings())
			assert.NoError(t, err)

			_, err = processor.ProcessTraces(context.Background(), td)
			assert.Error(t, err)
		})
	}
}

func BenchmarkTwoSpans(b *testing.B) {
	tests := []struct {
		name       string
		statements []string
	}{
		{
			name:       "no processing",
			statements: []string{},
		},
		{
			name:       "set attribute",
			statements: []string{`set(attributes["test"], "pass") where name == "operationA"`},
		},
		{
			name:       "keep_keys attribute",
			statements: []string{`keep_keys(attributes, ["http.method"]) where name == "operationA"`},
		},
		{
			name:       "no match",
			statements: []string{`keep_keys(attributes, ["http.method"]) where name == "unknownOperation"`},
		},
		{
			name:       "inner field",
			statements: []string{`set(status.code, 1) where attributes["http.path"] == "/health"`},
		},
		{
			name: "inner field both spans",
			statements: []string{
				`set(status.code, 1) where name == "operationA"`,
				`set(status.code, 2) where name == "operationB"`,
			},
		},
	}

	for _, tt := range tests {
		b.Run(tt.name, func(b *testing.B) {
			processor, err := NewProcessor([]common.ContextStatements{{Context: "span", Statements: tt.statements}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(b, err)
			b.ResetTimer()
			for n := 0; n < b.N; n++ {
				td := constructTraces()
				_, err = processor.ProcessTraces(context.Background(), td)
				assert.NoError(b, err)
			}
		})
	}
}

func BenchmarkHundredSpans(b *testing.B) {
	tests := []struct {
		name       string
		statements []string
	}{
		{
			name:       "no processing",
			statements: []string{},
		},
		{
			name: "set status code",
			statements: []string{
				`set(status.code, 1) where name == "operationA"`,
				`set(status.code, 2) where name == "operationB"`,
			},
		},
		{
			name: "hundred statements",
			statements: func() []string {
				var statements []string
				statements = append(statements, `set(status.code, 1) where name == "operationA"`)
				for i := 0; i < 99; i++ {
					statements = append(statements, `keep_keys(attributes, ["http.method"]) where name == "unknownOperation"`)
				}
				return statements
			}(),
		},
	}
	for _, tt := range tests {
		b.Run(tt.name, func(b *testing.B) {
			processor, err := NewProcessor([]common.ContextStatements{{Context: "span", Statements: tt.statements}}, ottl.IgnoreError, componenttest.NewNopTelemetrySettings())
			assert.NoError(b, err)
			b.ResetTimer()
			for n := 0; n < b.N; n++ {
				td := constructTracesNum(100)
				_, err = processor.ProcessTraces(context.Background(), td)
				assert.NoError(b, err)
			}
		})
	}
}

func constructTraces() ptrace.Traces {
	td := ptrace.NewTraces()
	rs0 := td.ResourceSpans().AppendEmpty()
	rs0.Resource().Attributes().PutStr("host.name", "localhost")
	rs0ils0 := rs0.ScopeSpans().AppendEmpty()
	rs0ils0.Scope().SetName("scope")
	fillSpanOne(rs0ils0.Spans().AppendEmpty())
	fillSpanTwo(rs0ils0.Spans().AppendEmpty())
	return td
}

func constructTracesNum(num int) ptrace.Traces {
	td := ptrace.NewTraces()
	rs0 := td.ResourceSpans().AppendEmpty()
	rs0ils0 := rs0.ScopeSpans().AppendEmpty()
	for i := 0; i < num; i++ {
		fillSpanOne(rs0ils0.Spans().AppendEmpty())
	}
	return td
}

func fillSpanOne(span ptrace.Span) {
	span.SetName("operationA")
	span.SetSpanID(spanID)
	span.SetParentSpanID(spanID2)
	span.SetTraceID(traceID)
	span.SetStartTimestamp(TestSpanStartTimestamp)
	span.SetEndTimestamp(TestSpanEndTimestamp)
	span.SetDroppedAttributesCount(1)
	span.SetDroppedLinksCount(1)
	span.SetDroppedEventsCount(1)
	span.SetKind(1)
	span.TraceState().FromRaw("new")
	span.Attributes().PutStr("http.method", "get")
	span.Attributes().PutStr("http.path", "/health")
	span.Attributes().PutStr("http.url", "http://localhost/health")
	span.Attributes().PutStr("flags", "A|B|C")
	span.Attributes().PutStr("total.string", "123456789")
	status := span.Status()
	status.SetCode(ptrace.StatusCodeError)
	status.SetMessage("status-cancelled")
	event := span.Events().AppendEmpty()
	event.SetName("eventA")
}

func fillSpanTwo(span ptrace.Span) {
	span.SetName("operationB")
	span.SetStartTimestamp(TestSpanStartTimestamp)
	span.SetEndTimestamp(TestSpanEndTimestamp)
	span.Attributes().PutStr("http.method", "get")
	span.Attributes().PutStr("http.path", "/health")
	span.Attributes().PutStr("http.url", "http://localhost/health")
	span.Attributes().PutStr("flags", "C|D")
	span.Attributes().PutStr("total.string", "345678")
	link0 := span.Links().AppendEmpty()
	link0.SetDroppedAttributesCount(4)
	link1 := span.Links().AppendEmpty()
	link1.SetDroppedAttributesCount(4)
	span.SetDroppedLinksCount(3)
	status := span.Status()
	status.SetCode(ptrace.StatusCodeError)
	status.SetMessage("status-cancelled")
	event := span.Events().AppendEmpty()
	event.SetName("eventB")
}
