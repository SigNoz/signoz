package dashboardtypes

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ══════════════════════════════════════════════
// Widgets → Panels
// ══════════════════════════════════════════════

// convertV1Panels walks the v1 `widgets` array and produces v2 panels keyed by
// the v1 widget id. WidgetRow entries (panelTypes == "row") are dropped here
// and consumed by convertV1Layouts as section headers.
func (d *v1Decoder) convertV1Panels(raw any) map[string]*Panel {
	if raw == nil {
		return nil
	}
	widgetsRaw, ok := raw.([]any)
	if !ok {
		d.noteMalformedField("widgets", raw)
		return nil
	}
	panels := make(map[string]*Panel, len(widgetsRaw))
	for i, widgetRaw := range widgetsRaw {
		widget, ok := widgetRaw.(map[string]any)
		if !ok {
			d.noteMalformedField(fmt.Sprintf("widgets[%d]", i), widgetRaw)
			continue
		}
		// A non-string (or missing) id can't be referenced by any layout entry, and
		// v1 doesn't render such widgets either — skip silently, don't flag it as
		// malformed. Read directly (not via readString) to avoid a malformed note.
		id, ok := widget["id"].(string)
		if !ok || id == "" {
			continue
		}
		var panel *Panel
		panelType := d.readString(widget, "panelTypes")
		switch panelType {
		case "graph":
			panel = d.convertGraphWidget(widget)
		case "time_series", "TIME_SERIES":
			// Malformed panelTypes: the canonical v1 value is "graph". Some dashboards
			// stored the v2/enum-style name instead; accept it as a time-series graph.
			panel = d.convertGraphWidget(widget)
		case "bar":
			panel = d.convertBarWidget(widget)
		case "value":
			panel = d.convertValueWidget(widget)
		case "pie":
			panel = d.convertPieWidget(widget)
		case "table":
			panel = d.convertTableWidget(widget)
		case "histogram":
			panel = d.convertHistogramWidget(widget)
		case "list":
			panel = d.convertListWidget(widget)
		case "row":
			// "row" (section header) is handled by the layout pass;
			continue
		default:
			// Unknown/unsupported panel type — v1 can't render it either, so skip the
			// widget silently rather than failing the whole migration.
			continue
		}
		if panel == nil {
			continue
		}
		if len(panel.Spec.Queries) == 0 {
			// No renderable queries — every query was dropped as unrenderable, or none
			// were defined. v1 renders nothing, so skip the widget silently.
			continue
		}
		panels[id] = panel
	}
	return panels
}

func (d *v1Decoder) convertGraphWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindTimeSeries,
				Spec: &TimeSeriesPanelSpec{
					Visualization: TimeSeriesVisualization{
						BasicVisualization: d.basicVisualization(w),
						FillSpans:          d.readBool(w, "fillSpans"),
					},
					Formatting: d.panelFormatting(w),
					ChartAppearance: TimeSeriesChartAppearance{
						LineInterpolation: mapV1Enum(d.readString(w, "lineInterpolation"), LineInterpolationSpline,
							LineInterpolationLinear, LineInterpolationSpline, LineInterpolationStepAfter, LineInterpolationStepBefore),
						ShowPoints: d.readBool(w, "showPoints"),
						LineStyle:  mapV1Enum(d.readString(w, "lineStyle"), LineStyleSolid, LineStyleSolid, LineStyleDashed),
						FillMode:   mapV1Enum(d.readString(w, "fillMode"), FillModeNone, FillModeSolid, FillModeGradient, FillModeNone),
						SpanGaps:   mapV1SpanGaps(w["spanGaps"]),
					},
					Axes:       d.axesFromWidget(w),
					Legend:     d.legendFromWidget(w),
					Thresholds: d.mapV1ThresholdsWithLabel(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindTimeSeries),
		},
	}
}

func (d *v1Decoder) convertBarWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindBarChart,
				Spec: &BarChartPanelSpec{
					Visualization: BarChartVisualization{
						BasicVisualization: d.basicVisualization(w),
						FillSpans:          d.readBool(w, "fillSpans"),
						StackedBarChart:    d.readBool(w, "stackedBarChart"),
					},
					Formatting: d.panelFormatting(w),
					Axes:       d.axesFromWidget(w),
					Legend:     d.legendFromWidget(w),
					Thresholds: d.mapV1ThresholdsWithLabel(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindBarChart),
		},
	}
}

func (d *v1Decoder) convertValueWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindNumber,
				Spec: &NumberPanelSpec{
					Visualization: d.basicVisualization(w),
					Formatting:    d.panelFormatting(w),
					Thresholds:    d.mapV1ComparisonThresholds(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindNumber),
		},
	}
}

func (d *v1Decoder) convertPieWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindPieChart,
				Spec: &PieChartPanelSpec{
					Visualization: d.basicVisualization(w),
					Formatting:    d.panelFormatting(w),
					Legend:        d.legendFromWidget(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindPieChart),
		},
	}
}

func (d *v1Decoder) convertTableWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindTable,
				Spec: &TablePanelSpec{
					Visualization: d.basicVisualization(w),
					Formatting: TableFormatting{
						ColumnUnits:      d.readStringMap(w, "columnUnits"),
						DecimalPrecision: mapV1Precision(w["decimalPrecision"]),
					},
					Thresholds: d.mapV1TableThresholds(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindTable),
		},
	}
}

func (d *v1Decoder) convertHistogramWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindHistogram,
				Spec: &HistogramPanelSpec{
					HistogramBuckets: HistogramBuckets{
						BucketCount:           d.readFloatPtr(w, "bucketCount"),
						BucketWidth:           d.readFloatPtr(w, "bucketWidth"),
						MergeAllActiveQueries: d.readBool(w, "mergeAllActiveQueries"),
					},
					Legend: d.legendFromWidget(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindHistogram),
		},
	}
}

func (d *v1Decoder) convertListWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: d.widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindList,
				Spec: &ListPanelSpec{
					SelectFields: d.mapV1SelectFields(w),
				},
			},
			Queries: d.convertV1WidgetQuery(w, PanelKindList),
		},
	}
}

// ══════════════════════════════════════════════
// Panel-spec shared helpers
// ══════════════════════════════════════════════

func (d *v1Decoder) widgetDisplay(w map[string]any) Display {
	return Display{Name: clipName(d.readString(w, "title"), MaxDisplayNameLen), Description: d.readString(w, "description")}
}

func (d *v1Decoder) basicVisualization(w map[string]any) BasicVisualization {
	return BasicVisualization{TimePreference: mapV1TimePreference(d.readString(w, "timePreferance"))}
}

func (d *v1Decoder) panelFormatting(w map[string]any) PanelFormatting {
	return PanelFormatting{Unit: d.readString(w, "yAxisUnit"), DecimalPrecision: mapV1Precision(w["decimalPrecision"])}
}

func (d *v1Decoder) axesFromWidget(w map[string]any) Axes {
	return Axes{
		SoftMin:    d.readFloatPtr(w, "softMin"),
		SoftMax:    d.readFloatPtr(w, "softMax"),
		IsLogScale: d.readBool(w, "isLogScale"),
	}
}

func (d *v1Decoder) legendFromWidget(w map[string]any) Legend {
	return Legend{
		Position:     mapV1Enum(d.readString(w, "legendPosition"), LegendPositionBottom, LegendPositionBottom, LegendPositionRight),
		CustomColors: d.readStringMap(w, "customLegendColors"),
	}
}

func (d *v1Decoder) mapV1SelectFields(w map[string]any) []telemetrytypes.TelemetryFieldKey {
	field := "selectedLogFields"
	raw := d.readArray(w, field)
	if len(raw) == 0 {
		field = "selectedTracesFields"
		raw = d.readArray(w, field)
	}
	if len(raw) == 0 {
		return nil
	}
	normalizePreV5FieldKeys(raw)
	fields, err := decodeTelemetryFields(raw)
	if err != nil {
		d.note("widget %q has malformed %s: %v", d.readString(w, "id"), field, err)
		return nil
	}
	// Drop nameless entries (blank column rows) — v2 requires a name, and the v1
	// UI renders nothing for them anyway.
	out := fields[:0]
	for _, f := range fields {
		if f.Name != "" {
			out = append(out, f)
		}
	}
	return out
}

func decodeTelemetryFields(raw []any) ([]telemetrytypes.TelemetryFieldKey, error) {
	bytes, err := json.Marshal(raw)
	if err != nil {
		return nil, err
	}
	var fields []telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal(bytes, &fields); err != nil {
		return nil, err
	}
	return fields, nil
}

// ══════════════════════════════════════════════
// Panel field mappers
// ══════════════════════════════════════════════

// v1 stores timePreferance as `GLOBAL_TIME`, `LAST_5_MIN`, … (see
// frontend/src/container/NewWidget/RightContainer/timeItems.ts). v2 uses the
// lowercase form, so the translation is just downcase.
func mapV1TimePreference(s string) TimePreference {
	if s == "" {
		return TimePreferenceGlobalTime
	}
	candidate := TimePreference{valuer.NewString(strings.ToLower(s))}
	for _, allowed := range candidate.Enum() {
		if allowed == candidate {
			return candidate
		}
	}
	return TimePreferenceGlobalTime
}

// mapV1Precision is polymorphic (string|number), so it type-switches the raw
// value rather than reading through a typed accessor.
func mapV1Precision(raw any) PrecisionOption {
	switch v := raw.(type) {
	case string:
		candidate := PrecisionOption{valuer.NewString(v)}
		for _, allowed := range candidate.Enum() {
			if allowed == candidate {
				return candidate
			}
		}
	case float64:
		n := int(v)
		if n >= 0 && n <= 4 {
			return PrecisionOption{valuer.NewString(strconv.Itoa(n))}
		}
	}
	return PrecisionOption2
}

// mapV1Enum picks the v1 string value if it matches one of the allowed v2
// values, otherwise returns the fallback. v1 frontend enums (lineInterpolation,
// lineStyle, fillMode, legendPosition) already use the v2 lowercase form.
func mapV1Enum[T interface{ StringValue() string }](s string, fallback T, allowed ...T) T {
	if s == "" {
		return fallback
	}
	for _, a := range allowed {
		if a.StringValue() == s {
			return a
		}
	}
	return fallback
}

// v1 spanGaps is `boolean | number`. true → span every gap; false → never span;
// a number is interpreted (per frontend SeriesProps.spanGaps docs) as an
// X-axis threshold in seconds. Polymorphic, so it type-switches the raw value.
func mapV1SpanGaps(raw any) SpanGaps {
	switch v := raw.(type) {
	case bool:
		return SpanGaps{FillOnlyBelow: false}
	case float64:
		return SpanGaps{FillOnlyBelow: true, FillLessThan: time.Duration(v * float64(time.Second)).String()}
	}
	return SpanGaps{FillOnlyBelow: false}
}

func (d *v1Decoder) mapV1ThresholdsWithLabel(w map[string]any) []ThresholdWithLabel {
	rawSlice := d.readObjects(w, "thresholds")
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]ThresholdWithLabel, 0, len(rawSlice))
	for _, t := range rawSlice {
		color := d.readString(t, "thresholdColor")
		label := d.readString(t, "thresholdLabel")
		if color == "" || label == "" {
			// v2 ThresholdWithLabel requires both; drop entries that wouldn't validate.
			continue
		}
		value := d.readFloat(t, "thresholdValue")
		out = append(out, ThresholdWithLabel{Value: value, Unit: d.readString(t, "thresholdUnit"), Color: color, Label: label})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (d *v1Decoder) mapV1ComparisonThresholds(w map[string]any) []ComparisonThreshold {
	rawSlice := d.readObjects(w, "thresholds")
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]ComparisonThreshold, 0, len(rawSlice))
	for _, t := range rawSlice {
		color := d.readString(t, "thresholdColor")
		if color == "" {
			continue
		}
		value := d.readFloat(t, "thresholdValue")
		out = append(out, ComparisonThreshold{
			Value:    value,
			Operator: d.mapV1ComparisonOperator(d.readString(t, "thresholdOperator")),
			Unit:     d.readString(t, "thresholdUnit"),
			Color:    color,
			Format:   mapV1ThresholdFormat(t["thresholdFormat"]),
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (d *v1Decoder) mapV1TableThresholds(w map[string]any) []TableThreshold {
	rawSlice := d.readObjects(w, "thresholds")
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]TableThreshold, 0, len(rawSlice))
	for _, t := range rawSlice {
		color := d.readString(t, "thresholdColor")
		columnName := d.readString(t, "thresholdTableOptions")
		if color == "" || columnName == "" {
			continue
		}
		value := d.readFloat(t, "thresholdValue")
		out = append(out, TableThreshold{
			ComparisonThreshold: ComparisonThreshold{
				Value:    value,
				Operator: d.mapV1ComparisonOperator(d.readString(t, "thresholdOperator")),
				Unit:     d.readString(t, "thresholdUnit"),
				Color:    color,
				Format:   mapV1ThresholdFormat(t["thresholdFormat"]),
			},
			ColumnName: columnName,
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (d *v1Decoder) mapV1ComparisonOperator(s string) ComparisonOperator {
	switch s {
	case ">", "gt":
		return ComparisonOperatorAbove
	case ">=", "gte":
		return ComparisonOperatorAboveOrEqual
	case "<", "lt":
		return ComparisonOperatorBelow
	case "<=", "lte":
		return ComparisonOperatorBelowOrEqual
	case "=", "==", "eq":
		return ComparisonOperatorEqual
	case "!=", "neq":
		return ComparisonOperatorNotEqual
	default:
		// v1 often leaves the operator empty or carries an unknown value; default to
		// "above" without flagging.
		return ComparisonOperatorAbove
	}
}

// mapV1ThresholdFormat reads the raw value (not via readString) so a non-string
// thresholdFormat — some v1 dashboards store it as a number — defaults to text
// silently instead of being flagged malformed.
func mapV1ThresholdFormat(raw any) ThresholdFormat {
	s, _ := raw.(string)
	switch strings.ToLower(s) {
	case "background":
		return ThresholdFormatBackground
	case "text":
		return ThresholdFormatText
	}
	return ThresholdFormatText
}
