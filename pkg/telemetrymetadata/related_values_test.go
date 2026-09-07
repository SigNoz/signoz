package telemetrymetadata

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestRelatedValuesWindow(t *testing.T) {
	// 2026-09-07T10:30:00Z
	now := time.UnixMilli(1788777000000)
	sixHours := int64(6 * 60 * 60 * 1000)
	day := 24 * time.Hour

	tests := []struct {
		name          string
		start         int64
		end           int64
		maxWindow     time.Duration
		wantStart     int64
		wantEnd       int64
		wantTruncated bool
	}{
		{
			name:      "window inside the clamp keeps its end and is floored to the bucket",
			start:     now.Add(-3 * time.Hour).UnixMilli(),
			end:       now.UnixMilli(),
			maxWindow: day,
			wantStart: 1788760800000, // 06:00
			wantEnd:   now.UnixMilli(),
		},
		{
			name:          "window over the clamp keeps its end and loses its start",
			start:         now.Add(-30 * day).UnixMilli(),
			end:           now.UnixMilli(),
			maxWindow:     day,
			wantStart:     1788674400000, // the day before, 10:30 floored to 06:00
			wantEnd:       now.UnixMilli(),
			wantTruncated: true,
		},
		{
			name:          "unset bounds mean the last clamp window up to now",
			maxWindow:     day,
			wantStart:     1788674400000,
			wantEnd:       now.UnixMilli(),
			wantTruncated: true,
		},
		{
			name:      "no clamp keeps the requested start",
			start:     now.Add(-30 * day).UnixMilli(),
			end:       now.UnixMilli(),
			wantStart: now.Add(-30*day).UnixMilli() - now.Add(-30*day).UnixMilli()%sixHours,
			wantEnd:   now.UnixMilli(),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end, truncated := relatedValuesWindow(tt.start, tt.end, now, tt.maxWindow, sixHours)
			assert.Equal(t, tt.wantStart, start)
			assert.Equal(t, tt.wantEnd, end)
			assert.Equal(t, tt.wantTruncated, truncated)
		})
	}
}

func TestRelatedValuesSelectColumnFollowsTheResolvedContext(t *testing.T) {
	store := &telemetryMetaStore{fm: NewFieldMapper()}
	ctx := context.Background()
	resourceKey := &telemetrytypes.TelemetryFieldKey{Name: "service.name", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextResource}
	attributeKey := &telemetrytypes.TelemetryFieldKey{Name: "service.name", Signal: telemetrytypes.SignalLogs, FieldContext: telemetrytypes.FieldContextAttribute}
	spanKey := &telemetrytypes.TelemetryFieldKey{Name: "http_method", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextSpan}

	tests := []struct {
		name     string
		selector *telemetrytypes.FieldValueSelector
		keys     []*telemetrytypes.TelemetryFieldKey
		want     string
		signals  int
	}{
		{
			name:     "resource key reads the resource map only",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "service.name"}},
			keys:     []*telemetrytypes.TelemetryFieldKey{resourceKey},
			want:     "resource_attributes['service.name']",
			signals:  1,
		},
		{
			name:     "requested context wins over the lookup",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "service.name", FieldContext: telemetrytypes.FieldContextAttribute}},
			keys:     []*telemetrytypes.TelemetryFieldKey{resourceKey, attributeKey},
			want:     "attributes['service.name']",
			signals:  1,
		},
		{
			name:     "key in two maps reads both",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "service.name"}},
			keys:     []*telemetrytypes.TelemetryFieldKey{resourceKey, attributeKey},
			want:     "multiIf(notEmpty(resource_attributes['service.name']), resource_attributes['service.name'], attributes['service.name'])",
			signals:  2,
		},
		{
			name:     "span field reads the intrinsic map",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "http_method"}},
			keys:     []*telemetrytypes.TelemetryFieldKey{spanKey},
			want:     "intrinsic_attributes['http_method']",
			signals:  1,
		},
		{
			name:     "span name also reads attributes for rows written before the intrinsic map",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "name", FieldContext: telemetrytypes.FieldContextSpan}},
			want:     "multiIf(notEmpty(intrinsic_attributes['name']), intrinsic_attributes['name'], attributes['name'])",
		},
		{
			name:     "unknown key reads every map",
			selector: &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "mystery"}},
			want:     "multiIf(notEmpty(intrinsic_attributes['mystery']), intrinsic_attributes['mystery'], notEmpty(resource_attributes['mystery']), resource_attributes['mystery'], attributes['mystery'])",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			target := resolveRelatedTarget(tt.selector, tt.keys)
			assert.Equal(t, tt.want, store.relatedValuesSelectColumn(ctx, valuer.UUID{}, tt.selector.Name, target))
			assert.Len(t, target.signals, tt.signals)
		})
	}
}

func TestRelatedValuesSignalScopesToTheOnlySignalSeen(t *testing.T) {
	selector := &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "service.name"}}

	target := resolveRelatedTarget(selector, []*telemetrytypes.TelemetryFieldKey{
		{Name: "service.name", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextResource},
	})
	assert.Equal(t, telemetrytypes.SignalTraces, relatedValuesSignal(telemetrytypes.SignalUnspecified, target))
	assert.Equal(t, telemetrytypes.SignalLogs, relatedValuesSignal(telemetrytypes.SignalLogs, target), "a requested signal is kept")

	target = resolveRelatedTarget(selector, []*telemetrytypes.TelemetryFieldKey{
		{Name: "service.name", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextResource},
		{Name: "service.name", Signal: telemetrytypes.SignalLogs, FieldContext: telemetrytypes.FieldContextResource},
	})
	assert.Equal(t, telemetrytypes.SignalUnspecified, relatedValuesSignal(telemetrytypes.SignalUnspecified, target), "a key seen in two signals scans both")
}

func TestRelatedValuesContextsAreSharedBySelectAndSearch(t *testing.T) {
	selector := &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "http_method"}}
	target := resolveRelatedTarget(selector, []*telemetrytypes.TelemetryFieldKey{
		{Name: "http_method", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextSpan},
	})
	assert.Equal(t, []telemetrytypes.FieldContext{telemetrytypes.FieldContextSpan}, relatedValuesContexts("http_method", target), "a span field is searched in the intrinsic map only")

	selector = &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "name", FieldContext: telemetrytypes.FieldContextSpan}}
	assert.Equal(t, []telemetrytypes.FieldContext{telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextAttribute}, relatedValuesContexts("name", resolveRelatedTarget(selector, nil)))
}

func TestConfigValidate(t *testing.T) {
	cfg := NewConfig()
	assert.NoError(t, cfg.Validate())
	cfg.RelatedValues.MaxConcurrency = -1
	assert.Error(t, cfg.Validate())
}
