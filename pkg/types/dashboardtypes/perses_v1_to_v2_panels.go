package dashboardtypes

import (
	"encoding/json"
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
func convertV1Panels(raw any) (map[string]*Panel, error) {
	if raw == nil {
		return map[string]*Panel{}, nil
	}
	rawSlice, ok := raw.([]any)
	if !ok {
		return nil, malformedV1FieldErr("widgets", raw)
	}
	panels := make(map[string]*Panel, len(rawSlice))
	for _, item := range rawSlice {
		widget, ok := item.(map[string]any)
		if !ok {
			continue
		}
		id, _ := widget["id"].(string)
		if id == "" {
			continue
		}
		panelType, _ := widget["panelTypes"].(string)
		var panel *Panel
		switch panelType {
		case "graph":
			panel = convertGraphWidget(widget)
		case "bar":
			panel = convertBarWidget(widget)
		case "value":
			panel = convertValueWidget(widget)
		case "pie":
			panel = convertPieWidget(widget)
		case "table":
			panel = convertTableWidget(widget)
		case "histogram":
			panel = convertHistogramWidget(widget)
		case "list":
			panel = convertListWidget(widget)
		default:
			// "row" (section header) is handled by the layout pass; unknown kinds skipped.
			continue
		}
		if panel == nil {
			continue
		}
		panels[id] = panel
	}
	return panels, nil
}

func convertGraphWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindTimeSeries,
				Spec: &TimeSeriesPanelSpec{
					Visualization: TimeSeriesVisualization{
						BasicVisualization: basicVisualization(w),
						FillSpans:          valueAt[bool](w, "fillSpans"),
					},
					Formatting: panelFormatting(w),
					ChartAppearance: TimeSeriesChartAppearance{
						LineInterpolation: mapV1Enum(w["lineInterpolation"], LineInterpolationSpline,
							LineInterpolationLinear, LineInterpolationSpline, LineInterpolationStepAfter, LineInterpolationStepBefore),
						ShowPoints: valueAt[bool](w, "showPoints"),
						LineStyle:  mapV1Enum(w["lineStyle"], LineStyleSolid, LineStyleSolid, LineStyleDashed),
						FillMode:   mapV1Enum(w["fillMode"], FillModeSolid, FillModeSolid, FillModeGradient, FillModeNone),
						SpanGaps:   mapV1SpanGaps(w["spanGaps"]),
					},
					Axes:       axesFromWidget(w),
					Legend:     legendFromWidget(w),
					Thresholds: mapV1ThresholdsWithLabel(w["thresholds"]),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindTimeSeries),
		},
	}
}

func convertBarWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindBarChart,
				Spec: &BarChartPanelSpec{
					Visualization: BarChartVisualization{
						BasicVisualization: basicVisualization(w),
						FillSpans:          valueAt[bool](w, "fillSpans"),
						StackedBarChart:    valueAt[bool](w, "stackedBarChart"),
					},
					Formatting: panelFormatting(w),
					Axes:       axesFromWidget(w),
					Legend:     legendFromWidget(w),
					Thresholds: mapV1ThresholdsWithLabel(w["thresholds"]),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindBarChart),
		},
	}
}

func convertValueWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindNumber,
				Spec: &NumberPanelSpec{
					Visualization: basicVisualization(w),
					Formatting:    panelFormatting(w),
					Thresholds:    mapV1ComparisonThresholds(w["thresholds"]),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindNumber),
		},
	}
}

func convertPieWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindPieChart,
				Spec: &PieChartPanelSpec{
					Visualization: basicVisualization(w),
					Formatting:    panelFormatting(w),
					Legend:        legendFromWidget(w),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindPieChart),
		},
	}
}

func convertTableWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindTable,
				Spec: &TablePanelSpec{
					Visualization: basicVisualization(w),
					Formatting: TableFormatting{
						ColumnUnits:      readStringMap(w["columnUnits"]),
						DecimalPrecision: mapV1Precision(w["decimalPrecision"]),
					},
					Thresholds: mapV1TableThresholds(w["thresholds"]),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindTable),
		},
	}
}

func convertHistogramWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindHistogram,
				Spec: &HistogramPanelSpec{
					HistogramBuckets: HistogramBuckets{
						BucketCount:           ptrValueAt[float64](w, "bucketCount"),
						BucketWidth:           ptrValueAt[float64](w, "bucketWidth"),
						MergeAllActiveQueries: valueAt[bool](w, "mergeAllActiveQueries"),
					},
					Legend: legendFromWidget(w),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindHistogram),
		},
	}
}

func convertListWidget(w map[string]any) *Panel {
	return &Panel{
		Kind: "Panel",
		Spec: PanelSpec{
			Display: widgetDisplay(w),
			Plugin: PanelPlugin{
				Kind: PanelKindList,
				Spec: &ListPanelSpec{
					SelectFields: mapV1SelectFields(w),
				},
			},
			Queries: convertV1WidgetQuery(w, PanelKindList),
		},
	}
}

// ══════════════════════════════════════════════
// Panel-spec shared helpers
// ══════════════════════════════════════════════

func widgetDisplay(w map[string]any) Display {
	title, _ := w["title"].(string)
	description, _ := w["description"].(string)
	return Display{Name: title, Description: description}
}

func basicVisualization(w map[string]any) BasicVisualization {
	return BasicVisualization{TimePreference: mapV1TimePreference(w["timePreferance"])}
}

func panelFormatting(w map[string]any) PanelFormatting {
	unit, _ := w["yAxisUnit"].(string)
	return PanelFormatting{Unit: unit, DecimalPrecision: mapV1Precision(w["decimalPrecision"])}
}

func axesFromWidget(w map[string]any) Axes {
	return Axes{
		SoftMin:    ptrValueAt[float64](w, "softMin"),
		SoftMax:    ptrValueAt[float64](w, "softMax"),
		IsLogScale: valueAt[bool](w, "isLogScale"),
	}
}

func legendFromWidget(w map[string]any) Legend {
	return Legend{
		Position:     mapV1Enum(w["legendPosition"], LegendPositionBottom, LegendPositionBottom, LegendPositionRight),
		CustomColors: readStringMap(w["customLegendColors"]),
	}
}

func mapV1SelectFields(w map[string]any) []telemetrytypes.TelemetryFieldKey {
	if raw, ok := w["selectedLogFields"].([]any); ok && len(raw) > 0 {
		return decodeTelemetryFields(raw)
	}
	if raw, ok := w["selectedTracesFields"].([]any); ok && len(raw) > 0 {
		return decodeTelemetryFields(raw)
	}
	return nil
}

func decodeTelemetryFields(raw []any) []telemetrytypes.TelemetryFieldKey {
	bytes, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	var fields []telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal(bytes, &fields); err != nil {
		return nil
	}
	return fields
}

// ══════════════════════════════════════════════
// Panel field mappers
// ══════════════════════════════════════════════

// v1 stores timePreferance as `GLOBAL_TIME`, `LAST_5_MIN`, … (see
// frontend/src/container/NewWidget/RightContainer/timeItems.ts). v2 uses the
// lowercase form, so the translation is just downcase.
func mapV1TimePreference(raw any) TimePreference {
	s, ok := raw.(string)
	if !ok || s == "" {
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
func mapV1Enum[T interface{ StringValue() string }](raw any, fallback T, allowed ...T) T {
	s, ok := raw.(string)
	if !ok || s == "" {
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
// X-axis threshold in seconds.
func mapV1SpanGaps(raw any) SpanGaps {
	switch v := raw.(type) {
	case bool:
		if v {
			return SpanGaps{FillOnlyBelow: false}
		}
		return SpanGaps{FillOnlyBelow: true}
	case float64:
		dur, err := valuer.ParseTextDuration(time.Duration(v * float64(time.Second)).String())
		if err != nil {
			return SpanGaps{FillOnlyBelow: false}
		}
		return SpanGaps{FillOnlyBelow: true, FillLessThan: dur}
	}
	return SpanGaps{FillOnlyBelow: false}
}

func mapV1ThresholdsWithLabel(raw any) []ThresholdWithLabel {
	rawSlice := readSliceOfMaps(raw)
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]ThresholdWithLabel, 0, len(rawSlice))
	for _, t := range rawSlice {
		color, _ := t["thresholdColor"].(string)
		label, _ := t["thresholdLabel"].(string)
		if color == "" || label == "" {
			// v2 ThresholdWithLabel requires both; drop entries that wouldn't validate.
			continue
		}
		value, _ := t["thresholdValue"].(float64)
		unit, _ := t["thresholdUnit"].(string)
		out = append(out, ThresholdWithLabel{Value: value, Unit: unit, Color: color, Label: label})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mapV1ComparisonThresholds(raw any) []ComparisonThreshold {
	rawSlice := readSliceOfMaps(raw)
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]ComparisonThreshold, 0, len(rawSlice))
	for _, t := range rawSlice {
		color, _ := t["thresholdColor"].(string)
		if color == "" {
			continue
		}
		out = append(out, ComparisonThreshold{
			Value:    valueAt[float64](t, "thresholdValue"),
			Operator: mapV1ComparisonOperator(t["thresholdOperator"]),
			Unit:     valueAt[string](t, "thresholdUnit"),
			Color:    color,
			Format:   mapV1ThresholdFormat(t["thresholdFormat"]),
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mapV1TableThresholds(raw any) []TableThreshold {
	rawSlice := readSliceOfMaps(raw)
	if len(rawSlice) == 0 {
		return nil
	}
	out := make([]TableThreshold, 0, len(rawSlice))
	for _, t := range rawSlice {
		color, _ := t["thresholdColor"].(string)
		columnName, _ := t["thresholdTableOptions"].(string)
		if color == "" || columnName == "" {
			continue
		}
		out = append(out, TableThreshold{
			ComparisonThreshold: ComparisonThreshold{
				Value:    valueAt[float64](t, "thresholdValue"),
				Operator: mapV1ComparisonOperator(t["thresholdOperator"]),
				Unit:     valueAt[string](t, "thresholdUnit"),
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

func mapV1ComparisonOperator(raw any) ComparisonOperator {
	s, _ := raw.(string)
	switch s {
	case ">":
		return ComparisonOperatorAbove
	case ">=":
		return ComparisonOperatorAboveOrEqual
	case "<":
		return ComparisonOperatorBelow
	case "<=":
		return ComparisonOperatorBelowOrEqual
	case "=":
		return ComparisonOperatorEqual
	case "!=":
		return ComparisonOperatorNotEqual
	}
	return ComparisonOperatorAbove
}

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
