package spantypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func attributeField(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{Name: name, FieldContext: telemetrytypes.FieldContextAttribute}
}

func resourceField(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{Name: name, FieldContext: telemetrytypes.FieldContextResource}
}

// selectFields resolve from the span's merged attribute bag (JSON or legacy maps) and from
// resources_string; leaf-only, empties and missing keys contribute nothing.
func TestNewFlamegraphSpanFromStorableSelectFields(t *testing.T) {
	testCases := []struct {
		name         string
		span         *StorableSpan
		selectFields []telemetrytypes.TelemetryFieldKey
		wantAttrs    map[string]any
		wantResource map[string]string
	}{
		{
			name:         "AttributeFields_ResolveFromFlattenedJSONPaths",
			span:         &StorableSpan{SpanID: "s1", AttributesJSON: makeAttributesJSON(map[string]any{"http.route": "/a", "http.retry.count": float64(2)})},
			selectFields: []telemetrytypes.TelemetryFieldKey{attributeField("http.route"), attributeField("http.retry.count"), attributeField("http"), attributeField("missing")},
			wantAttrs:    map[string]any{"http.route": "/a", "http.retry.count": float64(2)},
			wantResource: map[string]string{},
		},
		{
			name:         "AttributeFields_ResolveFromLegacyMaps",
			span:         &StorableSpan{SpanID: "s1", AttributesString: map[string]string{"http.route": "/a"}, AttributesNumber: map[string]float64{"http.retry.count": 2}},
			selectFields: []telemetrytypes.TelemetryFieldKey{attributeField("http.route"), attributeField("http.retry.count"), attributeField("missing")},
			wantAttrs:    map[string]any{"http.route": "/a", "http.retry.count": float64(2)},
			wantResource: map[string]string{},
		},
		{
			name:         "JSONNullValues_AreSkipped",
			span:         &StorableSpan{SpanID: "s1", AttributesJSON: makeAttributesJSON(map[string]any{"k": nil})},
			selectFields: []telemetrytypes.TelemetryFieldKey{attributeField("k")},
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{},
		},
		{
			name:         "ResourceFields_ComeFromResourcesStringEmptiesSkipped",
			span:         &StorableSpan{SpanID: "s1", ResourcesString: map[string]string{"service.name": "api", "deployment.environment": ""}},
			selectFields: []telemetrytypes.TelemetryFieldKey{resourceField("service.name"), resourceField("deployment.environment"), resourceField("missing")},
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{"service.name": "api"},
		},
		{
			name:         "NoSelectFields_EmptyBags",
			span:         &StorableSpan{SpanID: "s1", AttributesString: map[string]string{"http.route": "/a"}},
			selectFields: nil,
			wantAttrs:    map[string]any{},
			wantResource: map[string]string{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			flat := NewFlamegraphSpanFromStorable(testCase.span, 0, testCase.selectFields)
			assert.Equal(t, testCase.wantAttrs, flat.Attributes)
			assert.Equal(t, testCase.wantResource, flat.Resource)
		})
	}
}
