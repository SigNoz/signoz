package spantypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestNewFlamegraphSpanFromStorable_SelectFields(t *testing.T) {
	testCases := []struct {
		name         string
		span         StorableSpan
		selectFields []telemetrytypes.TelemetryFieldKey
		wantAttrs    map[string]any
		wantResource map[string]string
		wantScope    Scope
	}{
		{
			name: "JSONColumn_ResolvesDottedPaths",
			span: StorableSpan{AttributesJSON: jsonAttrs(map[string]any{"http.route": "/orders", "http.retry.count": int64(2)})},
			selectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "http.route", FieldContext: telemetrytypes.FieldContextAttribute},
				{Name: "http.retry.count", FieldContext: telemetrytypes.FieldContextAttribute},
				{Name: "http", FieldContext: telemetrytypes.FieldContextAttribute},
			},
			wantAttrs:    map[string]any{"http.route": "/orders", "http.retry.count": float64(2)},
			wantResource: map[string]string{},
			wantScope:    Scope{},
		},
		{
			name: "LegacyMaps_Resolve",
			span: StorableSpan{AttributesString: map[string]string{"http.route": "/cart"}, AttributesBool: map[string]bool{"cache.hit": true}},
			selectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "http.route", FieldContext: telemetrytypes.FieldContextAttribute},
				{Name: "cache.hit", FieldContext: telemetrytypes.FieldContextAttribute},
				{Name: "missing", FieldContext: telemetrytypes.FieldContextAttribute},
			},
			wantAttrs:    map[string]any{"http.route": "/cart", "cache.hit": true},
			wantResource: map[string]string{},
			wantScope:    Scope{},
		},
		{
			name: "ResourceFields_EmptyValueSkipped",
			span: StorableSpan{ResourcesString: map[string]string{"service.name": "checkout", "deployment.environment": ""}},
			selectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource},
				{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource},
			},
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{"service.name": "checkout"},
			wantScope:    Scope{},
		},
		{
			name: "ScopeFields_DeclaredPathsAndAttributes",
			span: StorableSpan{Scope: scopeColumn("io.opentelemetry.http", "1.2.0", map[string]any{"lib.lang": "go", "team": "payments"})},
			selectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "scope.name", FieldContext: telemetrytypes.FieldContextScope},
				{Name: "lib.lang", FieldContext: telemetrytypes.FieldContextScope},
				{Name: "missing", FieldContext: telemetrytypes.FieldContextScope},
			},
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{},
			wantScope:    Scope{"name": "io.opentelemetry.http", "attributes": map[string]any{"lib.lang": "go"}},
		},
		{
			name: "ScopeFields_UnsetSelection_Empty",
			span: StorableSpan{Scope: scopeColumn("io.opentelemetry.grpc", "", map[string]any{"rpc.system": "grpc"})},
			selectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "scope.version", FieldContext: telemetrytypes.FieldContextScope},
				{Name: "absent", FieldContext: telemetrytypes.FieldContextScope},
			},
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{},
			wantScope:    Scope{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			span := NewFlamegraphSpanFromStorable(&testCase.span, 0, testCase.selectFields)
			assert.Equal(t, testCase.wantAttrs, span.Attributes)
			assert.Equal(t, testCase.wantResource, span.Resource)
			assert.Equal(t, testCase.wantScope, span.Scope)
		})
	}
}

func TestNewMissingParentFlamegraphSpan_EmptyScope(t *testing.T) {
	span := NewMissingParentFlamegraphSpan(&FlamegraphSpan{SpanID: "child", ParentSpanID: "parent"})

	raw, err := json.Marshal(span)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"scope":{}`)
}
