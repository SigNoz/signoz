package dashboardtypes

import (
	"encoding/json"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/common/model"
	"github.com/swaggest/jsonschema-go"
)

// ══════════════════════════════════════════════
// SigNoz variable plugin specs
// ══════════════════════════════════════════════

type VariablePluginKind string

const (
	VariableKindDynamic VariablePluginKind = "signoz/DynamicVariable"
	VariableKindQuery   VariablePluginKind = "signoz/QueryVariable"
	VariableKindCustom  VariablePluginKind = "signoz/CustomVariable"
)

func (VariablePluginKind) Enum() []any {
	return []any{VariableKindDynamic, VariableKindQuery, VariableKindCustom}
}

type DynamicVariableSpec struct {
	// This could be extended to a richer selector in the future.
	Name   string                `json:"name" validate:"required" required:"true" description:"The attribute key whose observed values populate the variable, such as service.name."`
	Signal DynamicVariableSignal `json:"signal" required:"true" nullable:"false" description:"The signal the values are read from: traces, logs, metrics or all (default)."`
}

// DynamicVariableSignal is the telemetry signal a dynamic variable draws its
// values from. Separate from telemetrytypes.Signal because it carries "all"
// (values span every signal) rather than "" for an unpinned query signal.
type DynamicVariableSignal struct{ valuer.String }

var (
	DynamicVariableSignalTraces  = DynamicVariableSignal{valuer.NewString("traces")}
	DynamicVariableSignalLogs    = DynamicVariableSignal{valuer.NewString("logs")}
	DynamicVariableSignalMetrics = DynamicVariableSignal{valuer.NewString("metrics")}
	DynamicVariableSignalAll     = DynamicVariableSignal{valuer.NewString("all")} // default
)

func (DynamicVariableSignal) Enum() []any {
	return []any{DynamicVariableSignalTraces, DynamicVariableSignalLogs, DynamicVariableSignalMetrics, DynamicVariableSignalAll}
}

func (s DynamicVariableSignal) ValueOrDefault() string {
	if s.IsZero() {
		return DynamicVariableSignalAll.StringValue()
	}
	return s.StringValue()
}

func (s DynamicVariableSignal) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.ValueOrDefault())
}

func (s *DynamicVariableSignal) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid signal: must be a string, one of `traces`, `logs`, `metrics`, or `all`")
	}
	sig := DynamicVariableSignal{valuer.NewString(v)}
	switch sig {
	case DynamicVariableSignalTraces, DynamicVariableSignalLogs, DynamicVariableSignalMetrics, DynamicVariableSignalAll:
		*s = sig
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid signal %q: must be `traces`, `logs`, `metrics`, or `all`", v)
	}
}

type QueryVariableSpec struct {
	QueryValue string `json:"queryValue" validate:"required" required:"true" description:"A ClickHouse SQL query returning one column of selectable values; every returned column is offered."`
}

type CustomVariableSpec struct {
	CustomValue string `json:"customValue" validate:"required" required:"true" description:"The fixed values as a comma-separated list, such as 1,10,100."`
}

// ══════════════════════════════════════════════
// SigNoz query plugin specs — aliased from querybuildertypesv5
// ══════════════════════════════════════════════

type QueryPluginKind string

const (
	QueryKindBuilder       QueryPluginKind = "signoz/BuilderQuery"
	QueryKindAIBuilder     QueryPluginKind = "signoz/AIBuilderQuery"
	QueryKindComposite     QueryPluginKind = "signoz/CompositeQuery"
	QueryKindFormula       QueryPluginKind = "signoz/Formula"
	QueryKindPromQL        QueryPluginKind = "signoz/PromQLQuery"
	QueryKindClickHouseSQL QueryPluginKind = "signoz/ClickHouseSQL"
	QueryKindTraceOperator QueryPluginKind = "signoz/TraceOperator"
)

func (QueryPluginKind) Enum() []any {
	return []any{QueryKindBuilder, QueryKindAIBuilder, QueryKindComposite, QueryKindFormula, QueryKindPromQL, QueryKindClickHouseSQL, QueryKindTraceOperator}
}

type (
	CompositeQuerySpec     = qb.CompositeQuery
	QueryEnvelope          = qb.QueryEnvelope
	FormulaSpec            = qb.QueryBuilderFormula
	PromQLQuerySpec        = qb.PromQuery
	ClickHouseSQLQuerySpec = qb.ClickHouseQuery
	TraceOperatorSpec      = qb.QueryBuilderTraceOperator
)

// BuilderQuerySpec dispatches to the correct generic QueryBuilderQuery type
// based on the signal field, reusing the shared dispatch logic.
type BuilderQuerySpec struct {
	Spec any
}

func (b *BuilderQuerySpec) UnmarshalJSON(data []byte) error {
	spec, err := qb.UnmarshalBuilderQueryBySignal(data)
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid builder query spec")
	}
	b.Spec = spec
	return nil
}

// MarshalJSON delegates to the inner Spec so the on-wire shape matches what
// UnmarshalJSON expects (a flat builder-query payload with `signal` at the top
// level). Without this, Go's default would wrap it as {"Spec": {...}} and the
// signal-dispatch on read would fail.
func (b BuilderQuerySpec) MarshalJSON() ([]byte, error) {
	return json.Marshal(b.Spec)
}

// PrepareJSONSchema marks the envelope with x-signoz-discriminator keyed on
// `signal`. Each QueryBuilderQuery[T] variant pins `signal` to its one value
// (via its own PrepareJSONSchema in the qb package), so the union resolves
// cleanly even though it doesn't carry a `kind`.
func (BuilderQuerySpec) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "signal", map[string]string{
		telemetrytypes.SignalLogs.StringValue():    schemaRef("Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregation"),
		telemetrytypes.SignalMetrics.StringValue(): schemaRef("Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregation"),
		telemetrytypes.SignalTraces.StringValue():  schemaRef("Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregation"),
	})
}

// JSONSchemaOneOf exposes the three signal-dispatched shapes a builder query
// can take. Mirrors qb.UnmarshalBuilderQueryBySignal's runtime dispatch. Each
// QueryBuilderQuery[T] pins its own `signal` enum (see its PrepareJSONSchema).
func (BuilderQuerySpec) JSONSchemaOneOf() []any {
	return []any{
		qb.QueryBuilderQuery[qb.LogAggregation]{},
		qb.QueryBuilderQuery[qb.MetricAggregation]{},
		qb.QueryBuilderQuery[qb.TraceAggregation]{},
	}
}

// AIBuilderQuerySpec is the spec of a signoz/AIBuilderQuery plugin: a gen_ai-scoped
// (AI observability) traces builder query, executed as qb.QueryTypeBuilderAI. The
// signal is implied by the kind and pinned to traces, mirroring the builder_ai_query
// QueryEnvelope decode.
type AIBuilderQuerySpec qb.QueryBuilderQuery[qb.TraceAggregation]

func (b *AIBuilderQuerySpec) UnmarshalJSON(data []byte) error {
	var spec qb.QueryBuilderQuery[qb.TraceAggregation]
	if err := json.Unmarshal(data, &spec); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid AI builder query spec")
	}
	spec.Signal = telemetrytypes.SignalTraces
	*b = AIBuilderQuerySpec(spec)
	return nil
}

func (AIBuilderQuerySpec) PrepareJSONSchema(s *jsonschema.Schema) error {
	return (qb.QueryBuilderQuery[qb.TraceAggregation]{}).PrepareJSONSchema(s)
}

// ══════════════════════════════════════════════
// SigNoz panel plugin specs
// ══════════════════════════════════════════════

type PanelPluginKind string

const (
	PanelKindTimeSeries  PanelPluginKind = "signoz/TimeSeriesPanel"
	PanelKindBarChart    PanelPluginKind = "signoz/BarChartPanel"
	PanelKindAreaChart   PanelPluginKind = "signoz/AreaChartPanel"
	PanelKindNumber      PanelPluginKind = "signoz/NumberPanel"
	PanelKindPieChart    PanelPluginKind = "signoz/PieChartPanel"
	PanelKindTable       PanelPluginKind = "signoz/TablePanel"
	PanelKindHistogram   PanelPluginKind = "signoz/HistogramPanel"
	PanelKindList        PanelPluginKind = "signoz/ListPanel"
	PanelKindText        PanelPluginKind = "signoz/TextPanel"
	PanelKindHeatmap     PanelPluginKind = "signoz/HeatmapPanel"
	PanelKindScatterPlot PanelPluginKind = "signoz/ScatterPlotPanel"
)

func (PanelPluginKind) Enum() []any {
	return []any{PanelKindTimeSeries, PanelKindBarChart, PanelKindAreaChart, PanelKindNumber, PanelKindPieChart, PanelKindTable, PanelKindHistogram, PanelKindList, PanelKindText, PanelKindHeatmap, PanelKindScatterPlot}
}

func (k PanelPluginKind) rendersWithoutQuery() bool {
	return k == PanelKindText
}

type TimeSeriesPanelSpec struct {
	Visualization   TimeSeriesVisualization   `json:"visualization" description:"Time range and gap handling."`
	Formatting      PanelFormatting           `json:"formatting" description:"Unit and decimal precision of the values."`
	ChartAppearance TimeSeriesChartAppearance `json:"chartAppearance" description:"Line drawing options."`
	Axes            Axes                      `json:"axes" description:"Y axis bounds and scale."`
	Legend          Legend                    `json:"legend" description:"Legend placement and series colors."`
	Thresholds      []ThresholdWithLabel      `json:"thresholds" validate:"dive" description:"Horizontal reference lines drawn at fixed values."`
}

type TimeSeriesChartAppearance struct {
	LineInterpolation LineInterpolation `json:"lineInterpolation" description:"How points are joined: linear, spline (default), step_after or step_before."`
	ShowPoints        bool              `json:"showPoints" description:"Whether each data point is marked on the line."`
	LineStyle         LineStyle         `json:"lineStyle" description:"The line stroke: solid (default) or dashed."`
	FillMode          FillMode          `json:"fillMode" description:"The fill under each line: none (default), solid or gradient."`
	SpanGaps          SpanGaps          `json:"spanGaps" description:"Whether lines connect across missing points."`
}

type BarChartPanelSpec struct {
	Visualization BarChartVisualization `json:"visualization" description:"Time range, gap handling and stacking."`
	Formatting    PanelFormatting       `json:"formatting" description:"Unit and decimal precision of the values."`
	Axes          Axes                  `json:"axes" description:"Y axis bounds and scale."`
	Legend        Legend                `json:"legend" description:"Legend placement and series colors."`
	Thresholds    []ThresholdWithLabel  `json:"thresholds" validate:"dive" description:"Horizontal reference lines drawn at fixed values."`
}

type AreaChartPanelSpec struct {
	Visualization   AreaChartVisualization `json:"visualization" description:"Time range, gap handling and stacking."`
	Formatting      PanelFormatting        `json:"formatting" description:"Unit and decimal precision of the values."`
	ChartAppearance AreaChartAppearance    `json:"chartAppearance" description:"Line and fill drawing options."`
	Axes            Axes                   `json:"axes" description:"Y axis bounds and scale."`
	Legend          Legend                 `json:"legend" description:"Legend placement and series colors."`
	Thresholds      []ThresholdWithLabel   `json:"thresholds" validate:"dive" description:"Horizontal reference lines drawn at fixed values."`
}

// AreaChartAppearance repeats the line-drawing fields rather than embedding
// TimeSeriesChartAppearance: both carry a `fillMode` under different enums, and
// a duplicated json tag across an embed boundary is resolved by depth, which the
// schema reflector does not model.
type AreaChartAppearance struct {
	LineInterpolation LineInterpolation `json:"lineInterpolation" description:"How points are joined: linear, spline (default), step_after or step_before."`
	ShowPoints        bool              `json:"showPoints" description:"Whether each data point is marked on the line."`
	LineStyle         LineStyle         `json:"lineStyle" description:"The line stroke: solid (default) or dashed."`
	FillMode          AreaFillMode      `json:"fillMode" description:"The fill under each line: solid (default) or gradient."`
	// FillOpacity is a pointer so an omitted field resolves to the kind default at
	// render time; a plain value would make the Go zero value a transparent fill.
	FillOpacity *FillOpacity `json:"fillOpacity" description:"The fill opacity from 0 (transparent) to 1 (opaque). Null uses the chart default."`
	SpanGaps    SpanGaps     `json:"spanGaps" description:"Whether lines connect across missing points."`
}

type NumberPanelSpec struct {
	Visualization BasicVisualization    `json:"visualization" description:"The time range the value is computed over."`
	Formatting    PanelFormatting       `json:"formatting" description:"Unit and decimal precision of the value."`
	Thresholds    []ComparisonThreshold `json:"thresholds" validate:"dive" description:"Rules that recolor the value when it compares to a threshold as specified."`
}

type PieChartPanelSpec struct {
	Visualization BasicVisualization `json:"visualization" description:"The time range the slices are computed over."`
	Formatting    PanelFormatting    `json:"formatting" description:"Unit and decimal precision of the slice values."`
	Legend        Legend             `json:"legend" description:"Legend placement and slice colors."`
}

type TablePanelSpec struct {
	Visualization BasicVisualization `json:"visualization" description:"The time range the rows are computed over."`
	Formatting    TableFormatting    `json:"formatting" description:"Per-column units and decimal precision."`
	Thresholds    []TableThreshold   `json:"thresholds" validate:"dive" description:"Rules that recolor a cell when its column value compares to a threshold as specified."`
}

type HistogramPanelSpec struct {
	HistogramBuckets HistogramBuckets `json:"histogramBuckets" description:"How values are grouped into buckets."`
	Legend           Legend           `json:"legend" description:"Legend placement and series colors."`
}

type HistogramBuckets struct {
	BucketCount           *float64 `json:"bucketCount" description:"The approximate target number of buckets. Ignored when bucketWidth is positive. Null uses the chart default."`
	BucketWidth           *float64 `json:"bucketWidth" description:"The width of each bucket in the value unit. A positive value takes precedence over bucketCount; null or 0 lets the chart choose."`
	MergeAllActiveQueries bool     `json:"mergeAllActiveQueries" description:"Whether every series is combined into a single histogram instead of one per series."`
}

type ListPanelSpec struct {
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitzero" validate:"dive" description:"The columns shown for each row, as field keys with name and optional fieldContext, fieldDataType and signal. Empty shows the default columns."`
}

type HeatmapPanelSpec struct {
	Visualization   BasicVisualization     `json:"visualization" description:"The time range the heatmap covers."`
	Formatting      PanelFormatting        `json:"formatting" description:"Unit and decimal precision of the bucket bounds."`
	Axes            HeatmapAxes            `json:"axes" description:"The Y axis scale."`
	Legend          Legend                 `json:"legend" description:"Legend placement and series colors."`
	ChartAppearance HeatmapChartAppearance `json:"chartAppearance" description:"How bucket counts map to colors."`
}

// HeatmapAxes carries only the Y scale. The shared Axes type models a value
// axis with soft bounds, where a heatmap's Y axis is the bucket boundaries the
// response already fixed.
type HeatmapAxes struct {
	Y HeatmapAxis `json:"y" description:"The bucket axis."`
}

type HeatmapAxis struct {
	Scale HeatmapYScale `json:"scale" description:"How bucket bounds are spaced on the axis: auto (default), linear, log or symlog."`
}

type HeatmapChartAppearance struct {
	Colors HeatmapColors `json:"colors" description:"The color scale applied to bucket counts."`
}

type HeatmapColors struct {
	Mode    HeatmapColorMode  `json:"mode" description:"How counts are colored: palette (default) picks a hue from palette, opacity varies the opacity of fill."`
	Palette HeatmapPalette    `json:"palette" description:"The named color ramp used in palette mode, such as lava (default), ice or ember."`
	Scale   HeatmapColorScale `json:"scale" description:"How counts map onto the color range: log (default), sqrt or linear."`
	Steps   int               `json:"steps" validate:"omitempty,min=2,max=128" description:"The number of distinct color steps, 2 to 128. 0 uses the chart default."`
	// MinCount and MaxCount clamp the colour scale; nil derives them from the
	// grid, 0 and the highest count in it.
	MinCount *float64 `json:"minCount" description:"The count mapped to the lowest color. Null uses 0. Must not exceed maxCount."`
	MaxCount *float64 `json:"maxCount" description:"The count mapped to the highest color. Null uses the highest count in the grid."`
	// Fill applies in opacity mode; empty means the selected group's legend colour.
	Fill string `json:"fill" description:"The hex color varied in opacity mode. Empty uses the series legend color."`
}

func (c *HeatmapColors) UnmarshalJSON(data []byte) error {
	type alias HeatmapColors
	var tmp alias
	if err := json.Unmarshal(data, &tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid heatmap colors")
	}
	*c = HeatmapColors(tmp)
	return c.validate()
}

func (c HeatmapColors) validate() error {
	if c.MinCount != nil && c.MaxCount != nil && *c.MinCount > *c.MaxCount {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"heatmap colors.minCount %v is greater than colors.maxCount %v", *c.MinCount, *c.MaxCount)
	}
	return nil
}

type TextPanelSpec struct {
	Mode          TextMode         `json:"mode" description:"How text is interpreted. Only markdown is supported."`
	Text          string           `json:"text" description:"The content to render."`
	Presentation  TextPresentation `json:"presentation" description:"Alignment and background of the content."`
	HeaderOptions HeaderOptions    `json:"headerOptions" description:"Whether the panel header is shown."`
}

type ScatterPlotPanelSpec struct {
	Visualization BasicVisualization    `json:"visualization"`
	Dimensions    ScatterPlotDimensions `json:"dimensions"`
	Formatting    TableFormatting       `json:"formatting"`
	Axes          ScatterPlotAxes       `json:"axes"`
	Legend        Legend                `json:"legend"`
	Thresholds    []ThresholdWithLabel  `json:"thresholds" validate:"dive"`
}

// ScatterPlotDimensions binds result columns to what a dot encodes. Value columns
// use the Table column key, so formatting.columnUnits carries over between the
// two kinds.
type ScatterPlotDimensions struct {
	X     string `json:"x" description:"Value column key (queryName, or queryName.expression for a multi-aggregation query) plotted on the x axis. Empty uses the first value column."`
	Y     string `json:"y" description:"Value column key plotted on the y axis. Empty uses the second value column."`
	Size  string `json:"size" description:"Value column key that scales dot size. Empty draws every dot at the default size."`
	Color string `json:"color" description:"Group-by label name (e.g. k8s.namespace.name) that colours dots and drives the legend. Empty uses the renderer default."`
}

type ScatterPlotAxes struct {
	X ScatterPlotAxis `json:"x"`
	Y ScatterPlotAxis `json:"y"`
}

type ScatterPlotAxis struct {
	SoftMin *float64  `json:"softMin"`
	SoftMax *float64  `json:"softMax"`
	Scale   AxisScale `json:"scale"`
}

type TextPresentation struct {
	TextAlign     TextAlign     `json:"textAlign" description:"Horizontal alignment: left (default), center or right."`
	VerticalAlign VerticalAlign `json:"verticalAlign" description:"Vertical alignment: top (default), center or bottom."`
	Background    *string       `json:"background,omitempty" validate:"omitempty,hexcolor" description:"A hex background color such as #1f2937. Omit for the panel default."`
}

// ══════════════════════════════════════════════
// Panel common types
// ══════════════════════════════════════════════

type Axes struct {
	SoftMin    *float64 `json:"softMin" description:"The lowest value the Y axis always shows; data below it still extends the axis. Null fits the data."`
	SoftMax    *float64 `json:"softMax" description:"The highest value the Y axis always shows; data above it still extends the axis. Null fits the data."`
	IsLogScale bool     `json:"isLogScale" description:"Whether the Y axis uses a logarithmic scale."`
}

// HeaderOptions controls the panel card's header strip — the title/description
// row above the panel content. Phrased as hide so the zero value shows the
// header, matching every other panel kind.
type HeaderOptions struct {
	Hide bool `json:"hide" description:"Whether the title and description row above the content is hidden."`
}

type BasicVisualization struct {
	TimePreference TimePreference `json:"timePreference" description:"The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window."`
}

type TimeSeriesVisualization struct {
	BasicVisualization
	FillSpans bool `json:"fillSpans" description:"Whether intervals with no data are drawn as zero instead of a gap."`
}

type BarChartVisualization struct {
	BasicVisualization
	FillSpans       bool `json:"fillSpans" description:"Whether intervals with no data are drawn as zero instead of a gap."`
	StackedBarChart bool `json:"stackedBarChart" description:"Whether the series are stacked on top of each other."`
}

type AreaChartVisualization struct {
	BasicVisualization
	FillSpans bool      `json:"fillSpans" description:"Whether intervals with no data are drawn as zero instead of a gap."`
	Stack     StackMode `json:"stack" description:"How the areas combine: none (default) overlays them, normal stacks the values, percent stacks them as shares of the total."`
}

type PanelFormatting struct {
	Unit             string          `json:"unit" description:"The display unit of the values, such as By, ms, s, percent or percentunit. Use percent for values already expressed as percentages (95 displays as 95%) and percentunit for fractions (0.95 displays as 95%). Empty shows plain numbers."`
	DecimalPrecision PrecisionOption `json:"decimalPrecision" description:"Decimal places shown: 0, 1, 2 (default), 3, 4 or full."`
}

type TableFormatting struct {
	ColumnUnits      map[string]string `json:"columnUnits" description:"Unit id per value column, keyed by the column key: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Aggregation aliases are display labels, not keys."`
	DecimalPrecision PrecisionOption   `json:"decimalPrecision" description:"Decimal places shown: 0, 1, 2 (default), 3, 4 or full."`
}

type Legend struct {
	Position     LegendPosition    `json:"position" description:"Where the legend sits: bottom (default) or right."`
	Mode         LegendMode        `json:"mode" description:"The legend layout. Only list is supported."`
	CustomColors map[string]string `json:"customColors" description:"Hex colors keyed by series label, overriding the automatic palette."`
}

type ThresholdWithLabel struct {
	// Value is always present in the schema (required:"true"), but 0 is a legitimate
	// threshold, so it drops validate:"required" — go-playground's required treats a
	// zero float as unset and would wrongly reject value: 0.
	Value float64 `json:"value" required:"true" description:"The value the line is drawn at, in unit."`
	Unit  string  `json:"unit" description:"The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms."`
	Color string  `json:"color" validate:"required" required:"true" description:"The CSS color of the line, for example #F1575F, which matches the SigNoz red preset; CSS named colors such as red also work."`
	Label string  `json:"label" description:"The caption shown on the line."`
}

type ComparisonThreshold struct {
	// Value is always present in the schema (required:"true"), but 0 is a legitimate
	// threshold, so it drops validate:"required" — go-playground's required treats a
	// zero float as unset and would wrongly reject value: 0.
	Value    float64            `json:"value" required:"true" description:"The value compared against, in unit."`
	Operator ComparisonOperator `json:"operator" description:"The comparison that activates the threshold: above (default), below, above_or_equal, below_or_equal, equal or not_equal."`
	Unit     string             `json:"unit" description:"The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms."`
	Color    string             `json:"color" validate:"required" required:"true" description:"The CSS color applied to the text or background, per format, while the threshold is active. For example #F1575F matches the SigNoz red preset; CSS named colors such as red also work."`
	Format   ThresholdFormat    `json:"format" description:"What the color is applied to: text (default) or background."`
}

type TableThreshold struct {
	ComparisonThreshold
	ColumnName string `json:"columnName" validate:"required" required:"true" description:"The key of the value column the rule applies to: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Group-by columns are never colored, and aggregation aliases are display labels, not keys."`
}

// ══════════════════════════════════════════════
// Constrained scalar types — with default value
// ══════════════════════════════════════════════

type TimePreference struct{ valuer.String }

var (
	TimePreferenceGlobalTime = TimePreference{valuer.NewString("global_time")} // default
	TimePreferenceLast5Min   = TimePreference{valuer.NewString("last_5_min")}
	TimePreferenceLast15Min  = TimePreference{valuer.NewString("last_15_min")}
	TimePreferenceLast30Min  = TimePreference{valuer.NewString("last_30_min")}
	TimePreferenceLast1Hr    = TimePreference{valuer.NewString("last_1_hr")}
	TimePreferenceLast6Hr    = TimePreference{valuer.NewString("last_6_hr")}
	TimePreferenceLast1Day   = TimePreference{valuer.NewString("last_1_day")}
	TimePreferenceLast3Days  = TimePreference{valuer.NewString("last_3_days")}
	TimePreferenceLast1Week  = TimePreference{valuer.NewString("last_1_week")}
	TimePreferenceLast1Month = TimePreference{valuer.NewString("last_1_month")}
)

func (TimePreference) Enum() []any {
	return []any{TimePreferenceGlobalTime, TimePreferenceLast5Min, TimePreferenceLast15Min, TimePreferenceLast30Min, TimePreferenceLast1Hr, TimePreferenceLast6Hr, TimePreferenceLast1Day, TimePreferenceLast3Days, TimePreferenceLast1Week, TimePreferenceLast1Month}
}

func (t TimePreference) ValueOrDefault() string {
	if t.IsZero() {
		return TimePreferenceGlobalTime.StringValue()
	}
	return t.StringValue()
}

func (t TimePreference) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.ValueOrDefault())
}

func (t *TimePreference) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid timePreference: must be a string, one of `global_time`, `last_5_min`, `last_15_min`, `last_30_min`, `last_1_hr`, `last_6_hr`, `last_1_day`, `last_3_days`, `last_1_week`, or `last_1_month`")
	}
	tp := TimePreference{valuer.NewString(v)}
	switch tp {
	case TimePreferenceGlobalTime, TimePreferenceLast5Min, TimePreferenceLast15Min, TimePreferenceLast30Min, TimePreferenceLast1Hr, TimePreferenceLast6Hr, TimePreferenceLast1Day, TimePreferenceLast3Days, TimePreferenceLast1Week, TimePreferenceLast1Month:
		*t = tp
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid timePreference %q: must be `global_time`, `last_5_min`, `last_15_min`, `last_30_min`, `last_1_hr`, `last_6_hr`, `last_1_day`, `last_3_days`, `last_1_week`, or `last_1_month`", v)
	}
}

type LegendPosition struct{ valuer.String }

var (
	LegendPositionBottom = LegendPosition{valuer.NewString("bottom")} // default
	LegendPositionRight  = LegendPosition{valuer.NewString("right")}
)

func (LegendPosition) Enum() []any {
	return []any{LegendPositionBottom, LegendPositionRight}
}

func (l LegendPosition) ValueOrDefault() string {
	if l.IsZero() {
		return LegendPositionBottom.StringValue()
	}
	return l.StringValue()
}

func (l LegendPosition) MarshalJSON() ([]byte, error) {
	return json.Marshal(l.ValueOrDefault())
}

func (l *LegendPosition) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid legend position: must be a string, one of `bottom` or `right`")
	}
	lp := LegendPosition{valuer.NewString(v)}
	switch lp {
	case LegendPositionBottom, LegendPositionRight:
		*l = lp
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid legend position %q: must be `bottom` or `right`", v)
	}
}

type LegendMode struct{ valuer.String }

var (
	LegendModeList  = LegendMode{valuer.NewString("list")} // default
	LegendModeTable = LegendMode{valuer.NewString("table")}
)

func (LegendMode) Enum() []any {
	return []any{LegendModeList} // others are not supported in UI yet
}

func (m LegendMode) ValueOrDefault() string {
	if m.IsZero() {
		return LegendModeList.StringValue()
	}
	return m.StringValue()
}

func (m LegendMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.ValueOrDefault())
}

func (m *LegendMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid legend mode: must be a string, one of `list` or `table`")
	}
	lm := LegendMode{valuer.NewString(v)}
	switch lm {
	case LegendModeList, LegendModeTable:
		*m = lm
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid legend mode %q: must be `list` or `table`", v)
	}
}

type ThresholdFormat struct{ valuer.String }

var (
	ThresholdFormatText       = ThresholdFormat{valuer.NewString("text")} // default
	ThresholdFormatBackground = ThresholdFormat{valuer.NewString("background")}
)

func (ThresholdFormat) Enum() []any {
	return []any{ThresholdFormatText, ThresholdFormatBackground}
}

func (f ThresholdFormat) ValueOrDefault() string {
	if f.IsZero() {
		return ThresholdFormatText.StringValue()
	}
	return f.StringValue()
}

func (f ThresholdFormat) MarshalJSON() ([]byte, error) {
	return json.Marshal(f.ValueOrDefault())
}

func (f *ThresholdFormat) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid threshold format: must be a string, one of `text` or `background`")
	}
	tf := ThresholdFormat{valuer.NewString(v)}
	switch tf {
	case ThresholdFormatText, ThresholdFormatBackground:
		*f = tf
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid threshold format %q: must be `text` or `background`", v)
	}
}

// Uses valuer.String with custom UnmarshalJSON for validation, rather than
// ruletypes.CompareOperator which accepts any string at unmarshal time.
type ComparisonOperator struct{ valuer.String }

var (
	ComparisonOperatorAbove        = ComparisonOperator{valuer.NewString("above")} // default
	ComparisonOperatorBelow        = ComparisonOperator{valuer.NewString("below")}
	ComparisonOperatorAboveOrEqual = ComparisonOperator{valuer.NewString("above_or_equal")}
	ComparisonOperatorBelowOrEqual = ComparisonOperator{valuer.NewString("below_or_equal")}
	ComparisonOperatorEqual        = ComparisonOperator{valuer.NewString("equal")}
	ComparisonOperatorNotEqual     = ComparisonOperator{valuer.NewString("not_equal")}
)

func (ComparisonOperator) Enum() []any {
	return []any{ComparisonOperatorAbove, ComparisonOperatorBelow, ComparisonOperatorAboveOrEqual, ComparisonOperatorBelowOrEqual, ComparisonOperatorEqual, ComparisonOperatorNotEqual}
}

func (o ComparisonOperator) ValueOrDefault() string {
	if o.IsZero() {
		return ComparisonOperatorAbove.StringValue()
	}
	return o.StringValue()
}

func (o ComparisonOperator) MarshalJSON() ([]byte, error) {
	return json.Marshal(o.ValueOrDefault())
}

func (o *ComparisonOperator) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid comparison operator: must be a string, one of `above`, `below`, `above_or_equal`, `below_or_equal`, `equal`, or `not_equal`")
	}
	co := ComparisonOperator{valuer.NewString(v)}
	switch co {
	case ComparisonOperatorAbove, ComparisonOperatorBelow, ComparisonOperatorAboveOrEqual, ComparisonOperatorBelowOrEqual,
		ComparisonOperatorEqual, ComparisonOperatorNotEqual:
		*o = co
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid comparison operator %q: must be `above`, `below`, `above_or_equal`, `below_or_equal`, `equal`, or `not_equal`", v)
	}
}

type LineInterpolation struct{ valuer.String }

var (
	LineInterpolationLinear     = LineInterpolation{valuer.NewString("linear")}
	LineInterpolationSpline     = LineInterpolation{valuer.NewString("spline")} // default
	LineInterpolationStepAfter  = LineInterpolation{valuer.NewString("step_after")}
	LineInterpolationStepBefore = LineInterpolation{valuer.NewString("step_before")}
)

func (LineInterpolation) Enum() []any {
	return []any{LineInterpolationLinear, LineInterpolationSpline, LineInterpolationStepAfter, LineInterpolationStepBefore}
}

func (li LineInterpolation) ValueOrDefault() string {
	if li.IsZero() {
		return LineInterpolationSpline.StringValue()
	}
	return li.StringValue()
}

func (li LineInterpolation) MarshalJSON() ([]byte, error) {
	return json.Marshal(li.ValueOrDefault())
}

func (li *LineInterpolation) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid line interpolation: must be a string, one of `linear`, `spline`, `step_after`, or `step_before`")
	}
	val := LineInterpolation{valuer.NewString(v)}
	switch val {
	case LineInterpolationLinear, LineInterpolationSpline, LineInterpolationStepAfter, LineInterpolationStepBefore:
		*li = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid line interpolation %q: must be `linear`, `spline`, `step_after`, or `step_before`", v)
	}
}

type LineStyle struct{ valuer.String }

var (
	LineStyleSolid  = LineStyle{valuer.NewString("solid")} // default
	LineStyleDashed = LineStyle{valuer.NewString("dashed")}
)

func (LineStyle) Enum() []any {
	return []any{LineStyleSolid, LineStyleDashed}
}

func (ls LineStyle) ValueOrDefault() string {
	if ls.IsZero() {
		return LineStyleSolid.StringValue()
	}
	return ls.StringValue()
}

func (ls LineStyle) MarshalJSON() ([]byte, error) {
	return json.Marshal(ls.ValueOrDefault())
}

func (ls *LineStyle) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid line style: must be a string, one of `solid` or `dashed`")
	}
	val := LineStyle{valuer.NewString(v)}
	switch val {
	case LineStyleSolid, LineStyleDashed:
		*ls = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid line style %q: must be `solid` or `dashed`", v)
	}
}

// AxisScale `auto` leaves the choice to the renderer; `symlog` is log-like but
// defined at and below zero.
type AxisScale struct{ valuer.String }

var (
	AxisScaleAuto   = AxisScale{valuer.NewString("auto")} // default
	AxisScaleLinear = AxisScale{valuer.NewString("linear")}
	AxisScaleLog    = AxisScale{valuer.NewString("log")}
	AxisScaleSymlog = AxisScale{valuer.NewString("symlog")}
)

func (AxisScale) Enum() []any {
	return []any{AxisScaleAuto, AxisScaleLinear, AxisScaleLog, AxisScaleSymlog}
}

func (as AxisScale) ValueOrDefault() string {
	if as.IsZero() {
		return AxisScaleAuto.StringValue()
	}
	return as.StringValue()
}

func (as AxisScale) MarshalJSON() ([]byte, error) {
	return json.Marshal(as.ValueOrDefault())
}

func (as *AxisScale) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid axis scale: must be a string, one of `auto`, `linear`, `log`, or `symlog`")
	}
	val := AxisScale{valuer.NewString(v)}
	switch val {
	case AxisScaleAuto, AxisScaleLinear, AxisScaleLog, AxisScaleSymlog:
		*as = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid axis scale %q: must be `auto`, `linear`, `log`, or `symlog`", v)
	}
}

type FillMode struct{ valuer.String }

var (
	FillModeSolid    = FillMode{valuer.NewString("solid")}
	FillModeGradient = FillMode{valuer.NewString("gradient")}
	FillModeNone     = FillMode{valuer.NewString("none")} // default
)

func (FillMode) Enum() []any {
	return []any{FillModeSolid, FillModeGradient, FillModeNone}
}

func (fm FillMode) ValueOrDefault() string {
	if fm.IsZero() {
		return FillModeNone.StringValue()
	}
	return fm.StringValue()
}

func (fm FillMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(fm.ValueOrDefault())
}

func (fm *FillMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid fill mode: must be a string, one of `solid`, `gradient`, or `none`")
	}
	val := FillMode{valuer.NewString(v)}
	switch val {
	case FillModeSolid, FillModeGradient, FillModeNone:
		*fm = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid fill mode %q: must be `solid`, `gradient`, or `none`", v)
	}
}

type AreaFillMode struct{ valuer.String }

var (
	AreaFillModeSolid    = AreaFillMode{valuer.NewString("solid")} // default
	AreaFillModeGradient = AreaFillMode{valuer.NewString("gradient")}
)

func (AreaFillMode) Enum() []any {
	return []any{AreaFillModeSolid, AreaFillModeGradient}
}

func (fm AreaFillMode) ValueOrDefault() string {
	if fm.IsZero() {
		return AreaFillModeSolid.StringValue()
	}
	return fm.StringValue()
}

func (fm AreaFillMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(fm.ValueOrDefault())
}

func (fm *AreaFillMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid fill mode: must be a string, one of `solid`, `gradient`, or `none`")
	}
	val := AreaFillMode{valuer.NewString(v)}
	switch val {
	case AreaFillModeSolid, AreaFillModeGradient:
		*fm = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid fill mode %q: must be `solid`, `gradient`, or `none`", v)
	}
}

// StackMode is area-only. Bar stacking stays on BarChartVisualization.StackedBarChart,
// so `percent` is not reachable from a bar panel.
type StackMode struct{ valuer.String }

var (
	StackModeNone    = StackMode{valuer.NewString("none")} // default
	StackModeNormal  = StackMode{valuer.NewString("normal")}
	StackModePercent = StackMode{valuer.NewString("percent")}
)

func (StackMode) Enum() []any {
	return []any{StackModeNone, StackModeNormal, StackModePercent}
}

func (sm StackMode) ValueOrDefault() string {
	if sm.IsZero() {
		return StackModeNone.StringValue()
	}
	return sm.StringValue()
}

func (sm StackMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(sm.ValueOrDefault())
}

func (sm *StackMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid stack mode: must be a string, one of `none`, `normal`, or `percent`")
	}
	val := StackMode{valuer.NewString(v)}
	switch val {
	case StackModeNone, StackModeNormal, StackModePercent:
		*sm = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid stack mode %q: must be `none`, `normal`, or `percent`", v)
	}
}

// FillOpacity is the alpha of an area fill, in 0–1 because that is what the
// chart layer consumes directly. Unlike the enums in this section it has no
// ValueOrDefault: 0 is a legitimate value, so the kind default lives at render
// time behind a nil pointer.
type FillOpacity float64

func (FillOpacity) PrepareJSONSchema(s *jsonschema.Schema) error {
	s.WithMinimum(0).WithMaximum(1)
	return nil
}

func (o *FillOpacity) UnmarshalJSON(data []byte) error {
	var v float64
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid fillOpacity: must be a number between 0 and 1")
	}
	if v < 0 || v > 1 {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid fillOpacity %v: must be between 0 and 1", v)
	}
	*o = FillOpacity(v)
	return nil
}

type SpanGaps struct {
	FillOnlyBelow bool   `json:"fillOnlyBelow" description:"Controls whether lines connect across null values. When false (default), all gaps are connected. When true, only gaps smaller than fillLessThan are connected."`
	FillLessThan  string `json:"fillLessThan" description:"The largest gap still connected when fillOnlyBelow is true; longer gaps are left disconnected. Required in that case, as a positive Prometheus duration such as 30s, 5m or 1d."`
}

func (sg *SpanGaps) UnmarshalJSON(data []byte) error {
	type alias SpanGaps
	var tmp alias
	if err := json.Unmarshal(data, &tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid spanGaps")
	}
	*sg = SpanGaps(tmp)
	return sg.validate()
}

// validate enforces FillLessThan only when FillOnlyBelow is set, since that is
// the only mode in which it applies. It must then be a valid positive duration.
// prometheus's parser accepts day/week/year units (e.g. "1d"); time.ParseDuration
// caps at hours.
func (sg SpanGaps) validate() error {
	if !sg.FillOnlyBelow {
		return nil
	}
	if sg.FillLessThan == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spanGaps.fillLessThan is required when fillOnlyBelow is true")
	}
	d, err := model.ParseDuration(sg.FillLessThan)
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid spanGaps.fillLessThan duration %q", sg.FillLessThan)
	}
	if d <= 0 {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spanGaps.fillLessThan duration must be positive, got %q", sg.FillLessThan)
	}
	return nil
}

// TextMode is how a text panel interprets its `text`. Only markdown is
// rendered today; further modes (e.g. plain text, HTML) are expected.
type TextMode struct{ valuer.String }

var TextModeMarkdown = TextMode{valuer.NewString("markdown")} // default

func (TextMode) Enum() []any {
	return []any{TextModeMarkdown}
}

func (m TextMode) ValueOrDefault() string {
	if m.IsZero() {
		return TextModeMarkdown.StringValue()
	}
	return m.StringValue()
}

func (m TextMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.ValueOrDefault())
}

func (m *TextMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid text mode: must be the string `markdown`")
	}
	tm := TextMode{valuer.NewString(v)}
	switch tm {
	case TextModeMarkdown:
		*m = tm
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid text mode %q: must be `markdown`", v)
	}
}

type TextAlign struct{ valuer.String }

var (
	TextAlignLeft   = TextAlign{valuer.NewString("left")} // default
	TextAlignCenter = TextAlign{valuer.NewString("center")}
	TextAlignRight  = TextAlign{valuer.NewString("right")}
)

func (TextAlign) Enum() []any {
	return []any{TextAlignLeft, TextAlignCenter, TextAlignRight}
}

func (a TextAlign) ValueOrDefault() string {
	if a.IsZero() {
		return TextAlignLeft.StringValue()
	}
	return a.StringValue()
}

func (a TextAlign) MarshalJSON() ([]byte, error) {
	return json.Marshal(a.ValueOrDefault())
}

func (a *TextAlign) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid text align: must be a string, one of `left`, `center`, or `right`")
	}
	val := TextAlign{valuer.NewString(v)}
	switch val {
	case TextAlignLeft, TextAlignCenter, TextAlignRight:
		*a = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid text align %q: must be `left`, `center`, or `right`", v)
	}
}

type VerticalAlign struct{ valuer.String }

var (
	VerticalAlignTop    = VerticalAlign{valuer.NewString("top")} // default
	VerticalAlignCenter = VerticalAlign{valuer.NewString("center")}
	VerticalAlignBottom = VerticalAlign{valuer.NewString("bottom")}
)

func (VerticalAlign) Enum() []any {
	return []any{VerticalAlignTop, VerticalAlignCenter, VerticalAlignBottom}
}

func (a VerticalAlign) ValueOrDefault() string {
	if a.IsZero() {
		return VerticalAlignTop.StringValue()
	}
	return a.StringValue()
}

func (a VerticalAlign) MarshalJSON() ([]byte, error) {
	return json.Marshal(a.ValueOrDefault())
}

func (a *VerticalAlign) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid vertical align: must be a string, one of `top`, `center`, or `bottom`")
	}
	val := VerticalAlign{valuer.NewString(v)}
	switch val {
	case VerticalAlignTop, VerticalAlignCenter, VerticalAlignBottom:
		*a = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid vertical align %q: must be `top`, `center`, or `bottom`", v)
	}
}

type PrecisionOption struct{ valuer.String }

var (
	PrecisionOption0    = PrecisionOption{valuer.NewString("0")}
	PrecisionOption1    = PrecisionOption{valuer.NewString("1")}
	PrecisionOption2    = PrecisionOption{valuer.NewString("2")} // default
	PrecisionOption3    = PrecisionOption{valuer.NewString("3")}
	PrecisionOption4    = PrecisionOption{valuer.NewString("4")}
	PrecisionOptionFull = PrecisionOption{valuer.NewString("full")}
)

func (PrecisionOption) Enum() []any {
	return []any{PrecisionOption0, PrecisionOption1, PrecisionOption2, PrecisionOption3, PrecisionOption4, PrecisionOptionFull}
}

func (p PrecisionOption) ValueOrDefault() string {
	if p.IsZero() {
		return PrecisionOption2.StringValue()
	}
	return p.StringValue()
}

func (p PrecisionOption) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.ValueOrDefault())
}

func (p *PrecisionOption) UnmarshalJSON(data []byte) error {
	// Accept int values 0-4 and store as string.
	var n int
	if err := json.Unmarshal(data, &n); err == nil {
		switch n {
		case 0, 1, 2, 3, 4:
			p.String = valuer.NewString(strconv.Itoa(n))
			return nil
		default:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid precision option %d: must be `0`, `1`, `2`, `3`, `4`, or `full`", n)
		}
	}
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid precision option: must be `0`, `1`, `2`, `3`, `4`, or `full`")
	}
	val := PrecisionOption{valuer.NewString(v)}
	switch val {
	case PrecisionOption0, PrecisionOption1, PrecisionOption2, PrecisionOption3, PrecisionOption4, PrecisionOptionFull:
		*p = val
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid precision option %q: must be `0`, `1`, `2`, `3`, `4`, or `full`", v)
	}
}

type HeatmapColorMode struct{ valuer.String }

var (
	HeatmapColorModePalette = HeatmapColorMode{valuer.NewString("palette")} // default
	HeatmapColorModeOpacity = HeatmapColorMode{valuer.NewString("opacity")}
)

func (HeatmapColorMode) Enum() []any {
	return []any{HeatmapColorModePalette, HeatmapColorModeOpacity}
}

func (m HeatmapColorMode) ValueOrDefault() string {
	if m.IsZero() {
		return HeatmapColorModePalette.StringValue()
	}
	return m.StringValue()
}

func (m HeatmapColorMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.ValueOrDefault())
}

func (m *HeatmapColorMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid heatmap color mode: must be a string, one of `palette` or `opacity`")
	}
	mode := HeatmapColorMode{valuer.NewString(v)}
	switch mode {
	case HeatmapColorModePalette, HeatmapColorModeOpacity:
		*m = mode
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid heatmap color mode %q: must be `palette` or `opacity`", v)
	}
}

type HeatmapPalette struct{ valuer.String }

var (
	HeatmapPaletteIce      = HeatmapPalette{valuer.NewString("ice")}
	HeatmapPaletteMoss     = HeatmapPalette{valuer.NewString("moss")}
	HeatmapPaletteRust     = HeatmapPalette{valuer.NewString("rust")}
	HeatmapPaletteGraphite = HeatmapPalette{valuer.NewString("graphite")}
	HeatmapPaletteEmber    = HeatmapPalette{valuer.NewString("ember")}
	HeatmapPaletteLagoon   = HeatmapPalette{valuer.NewString("lagoon")}
	HeatmapPaletteOrchid   = HeatmapPalette{valuer.NewString("orchid")}
	HeatmapPaletteVerdant  = HeatmapPalette{valuer.NewString("verdant")}
	HeatmapPaletteLava     = HeatmapPalette{valuer.NewString("lava")} // default
	HeatmapPaletteBeacon   = HeatmapPalette{valuer.NewString("beacon")}
)

func (HeatmapPalette) Enum() []any {
	return []any{
		HeatmapPaletteIce, HeatmapPaletteMoss, HeatmapPaletteRust, HeatmapPaletteGraphite,
		HeatmapPaletteEmber, HeatmapPaletteLagoon, HeatmapPaletteOrchid, HeatmapPaletteVerdant,
		HeatmapPaletteLava, HeatmapPaletteBeacon,
	}
}

func (p HeatmapPalette) ValueOrDefault() string {
	if p.IsZero() {
		return HeatmapPaletteLava.StringValue()
	}
	return p.StringValue()
}

func (p HeatmapPalette) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.ValueOrDefault())
}

func (p *HeatmapPalette) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid heatmap palette: must be a string, one of `ice`, `moss`, `rust`, `graphite`, `ember`, `lagoon`, `orchid`, `verdant`, `lava`, or `beacon`")
	}
	palette := HeatmapPalette{valuer.NewString(v)}
	switch palette {
	case HeatmapPaletteIce, HeatmapPaletteMoss, HeatmapPaletteRust, HeatmapPaletteGraphite,
		HeatmapPaletteEmber, HeatmapPaletteLagoon, HeatmapPaletteOrchid, HeatmapPaletteVerdant,
		HeatmapPaletteLava, HeatmapPaletteBeacon:
		*p = palette
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid heatmap palette %q: must be `ice`, `moss`, `rust`, `graphite`, `ember`, `lagoon`, `orchid`, `verdant`, `lava`, or `beacon`", v)
	}
}

type HeatmapYScale struct{ valuer.String }

var (
	HeatmapYScaleAuto   = HeatmapYScale{valuer.NewString("auto")} // default
	HeatmapYScaleLinear = HeatmapYScale{valuer.NewString("linear")}
	HeatmapYScaleLog    = HeatmapYScale{valuer.NewString("log")}
	HeatmapYScaleSymlog = HeatmapYScale{valuer.NewString("symlog")}
)

func (HeatmapYScale) Enum() []any {
	return []any{HeatmapYScaleAuto, HeatmapYScaleLinear, HeatmapYScaleLog, HeatmapYScaleSymlog}
}

func (s HeatmapYScale) ValueOrDefault() string {
	if s.IsZero() {
		return HeatmapYScaleAuto.StringValue()
	}
	return s.StringValue()
}

func (s HeatmapYScale) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.ValueOrDefault())
}

func (s *HeatmapYScale) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid heatmap y scale: must be a string, one of `auto`, `linear`, `log`, or `symlog`")
	}
	scale := HeatmapYScale{valuer.NewString(v)}
	switch scale {
	case HeatmapYScaleAuto, HeatmapYScaleLinear, HeatmapYScaleLog, HeatmapYScaleSymlog:
		*s = scale
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid heatmap y scale %q: must be `auto`, `linear`, `log`, or `symlog`", v)
	}
}

type HeatmapColorScale struct{ valuer.String }

var (
	HeatmapColorScaleLog    = HeatmapColorScale{valuer.NewString("log")} // default
	HeatmapColorScaleSqrt   = HeatmapColorScale{valuer.NewString("sqrt")}
	HeatmapColorScaleLinear = HeatmapColorScale{valuer.NewString("linear")}
)

func (HeatmapColorScale) Enum() []any {
	return []any{HeatmapColorScaleLog, HeatmapColorScaleSqrt, HeatmapColorScaleLinear}
}

func (s HeatmapColorScale) ValueOrDefault() string {
	if s.IsZero() {
		return HeatmapColorScaleLog.StringValue()
	}
	return s.StringValue()
}

func (s HeatmapColorScale) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.ValueOrDefault())
}

func (s *HeatmapColorScale) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid heatmap color scale: must be a string, one of `log`, `sqrt`, or `linear`")
	}
	scale := HeatmapColorScale{valuer.NewString(v)}
	switch scale {
	case HeatmapColorScaleLog, HeatmapColorScaleSqrt, HeatmapColorScaleLinear:
		*s = scale
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid heatmap color scale %q: must be `log`, `sqrt`, or `linear`", v)
	}
}
