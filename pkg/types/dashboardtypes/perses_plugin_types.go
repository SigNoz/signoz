package dashboardtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ══════════════════════════════════════════════
// SigNoz variable plugin specs
// ══════════════════════════════════════════════

type VariablePluginKind struct{ valuer.String }

var (
	VariableKindDynamic = VariablePluginKind{valuer.NewString("signozdynamicvariable")}
	VariableKindQuery   = VariablePluginKind{valuer.NewString("signozqueryvariable")}
	VariableKindCustom  = VariablePluginKind{valuer.NewString("signozcustomvariable")}
	VariableKindTextbox = VariablePluginKind{valuer.NewString("signoztextboxvariable")}
)

func (VariablePluginKind) Enum() []any {
	return []any{VariableKindDynamic, VariableKindQuery, VariableKindCustom, VariableKindTextbox}
}

type DynamicVariableSpec struct {
	// Name is the name of the attribute being fetched dynamically from the
	// signal. This could be extended to a richer selector in the future.
	Name   string `json:"name" validate:"required" required:"true"`
	Signal string `json:"signal"`
}

type QueryVariableSpec struct {
	QueryValue string `json:"queryValue" validate:"required" required:"true"`
}

type CustomVariableSpec struct {
	CustomValue string `json:"customValue" validate:"required" required:"true"`
}

type TextboxVariableSpec struct{}

// ══════════════════════════════════════════════
// SigNoz query plugin specs — aliased from querybuildertypesv5
// ══════════════════════════════════════════════

type QueryPluginKind struct{ valuer.String }

var (
	QueryKindBuilder       = QueryPluginKind{valuer.NewString("signozbuilderquery")}
	QueryKindComposite     = QueryPluginKind{valuer.NewString("signozcompositequery")}
	QueryKindFormula       = QueryPluginKind{valuer.NewString("signozformula")}
	QueryKindPromQL        = QueryPluginKind{valuer.NewString("signozpromqlquery")}
	QueryKindClickHouseSQL = QueryPluginKind{valuer.NewString("signozclickhousesql")}
	QueryKindTraceOperator = QueryPluginKind{valuer.NewString("signoztraceoperator")}
)

func (QueryPluginKind) Enum() []any {
	return []any{QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindPromQL, QueryKindClickHouseSQL, QueryKindTraceOperator}
}

type (
	CompositeQuerySpec     = qb.CompositeQuery
	QueryEnvelope          = qb.QueryEnvelope
	FormulaSpec            = qb.QueryBuilderFormula
	PromQLQuerySpec        = qb.PromQuery
	ClickHouseSQLQuerySpec = qb.ClickHouseQuery
	TraceOperatorSpec      = qb.QueryBuilderTraceOperator
)

// BuilderQuerySpec dispatches to MetricBuilderQuerySpec, LogBuilderQuerySpec,
// or TraceBuilderQuerySpec based on the signal field.

type (
	MetricBuilderQuerySpec = qb.QueryBuilderQuery[qb.MetricAggregation]
	LogBuilderQuerySpec    = qb.QueryBuilderQuery[qb.LogAggregation]
	TraceBuilderQuerySpec  = qb.QueryBuilderQuery[qb.TraceAggregation]
)

type BuilderQuerySpec struct {
	Spec any
}

func (b *BuilderQuerySpec) UnmarshalJSON(data []byte) error {
	var peek struct {
		Signal string `json:"signal"`
	}
	if err := json.Unmarshal(data, &peek); err != nil {
		return err
	}
	switch peek.Signal {
	case "metrics":
		var spec MetricBuilderQuerySpec
		if err := json.Unmarshal(data, &spec); err != nil {
			return err
		}
		b.Spec = spec
	case "logs":
		var spec LogBuilderQuerySpec
		if err := json.Unmarshal(data, &spec); err != nil {
			return err
		}
		b.Spec = spec
	case "traces":
		var spec TraceBuilderQuerySpec
		if err := json.Unmarshal(data, &spec); err != nil {
			return err
		}
		b.Spec = spec
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid signal %q: must be metrics, logs, or traces", peek.Signal)
	}
	return nil
}

// ══════════════════════════════════════════════
// SigNoz panel plugin specs
// ══════════════════════════════════════════════

type PanelPluginKind struct{ valuer.String }

var (
	PanelKindTimeSeries = PanelPluginKind{valuer.NewString("signoztimeseriespanel")}
	PanelKindBarChart   = PanelPluginKind{valuer.NewString("signozbarchartpanel")}
	PanelKindNumber     = PanelPluginKind{valuer.NewString("signoznumberpanel")}
	PanelKindPieChart   = PanelPluginKind{valuer.NewString("signozpiechartpanel")}
	PanelKindTable      = PanelPluginKind{valuer.NewString("signoztablepanel")}
	PanelKindHistogram  = PanelPluginKind{valuer.NewString("signozhistogrampanel")}
	PanelKindList       = PanelPluginKind{valuer.NewString("signozlistpanel")}
)

func (PanelPluginKind) Enum() []any {
	return []any{PanelKindTimeSeries, PanelKindBarChart, PanelKindNumber, PanelKindPieChart, PanelKindTable, PanelKindHistogram, PanelKindList}
}

type DatasourcePluginKind struct{ valuer.String }

var (
	DatasourceKindSigNoz = DatasourcePluginKind{valuer.NewString("signozdatasource")}
)

func (DatasourcePluginKind) Enum() []any {
	return []any{DatasourceKindSigNoz}
}

type TimeSeriesPanelSpec struct {
	Visualization   TimeSeriesVisualization   `json:"visualization"`
	Formatting      PanelFormatting           `json:"formatting"`
	ChartAppearance TimeSeriesChartAppearance `json:"chartAppearance"`
	Axes            Axes                      `json:"axes"`
	Legend          Legend                    `json:"legend"`
	Thresholds      []ThresholdWithLabel      `json:"thresholds" validate:"dive"`
}

type TimeSeriesChartAppearance struct {
	LineInterpolation LineInterpolation `json:"lineInterpolation"`
	ShowPoints        bool              `json:"showPoints"`
	LineStyle         LineStyle         `json:"lineStyle"`
	FillMode          FillMode          `json:"fillMode"`
	SpanGaps          SpanGaps          `json:"spanGaps"`
}

type BarChartPanelSpec struct {
	Visualization BarChartVisualization `json:"visualization"`
	Formatting    PanelFormatting       `json:"formatting"`
	Axes          Axes                  `json:"axes"`
	Legend        Legend                `json:"legend"`
	Thresholds    []ThresholdWithLabel  `json:"thresholds" validate:"dive"`
}

type NumberPanelSpec struct {
	Visualization BasicVisualization    `json:"visualization"`
	Formatting    PanelFormatting       `json:"formatting"`
	Thresholds    []ComparisonThreshold `json:"thresholds" validate:"dive"`
}

type PieChartPanelSpec struct {
	Visualization BasicVisualization `json:"visualization"`
	Formatting    PanelFormatting    `json:"formatting"`
	Legend        Legend             `json:"legend"`
}

type TablePanelSpec struct {
	Visualization BasicVisualization `json:"visualization"`
	Formatting    TableFormatting    `json:"formatting"`
	Thresholds    []TableThreshold   `json:"thresholds" validate:"dive"`
}

type HistogramPanelSpec struct {
	HistogramBuckets HistogramBuckets `json:"histogramBuckets"`
	Legend           Legend           `json:"legend"`
}

type HistogramBuckets struct {
	BucketCount           *float64 `json:"bucketCount"`
	BucketWidth           *float64 `json:"bucketWidth"`
	MergeAllActiveQueries bool     `json:"mergeAllActiveQueries"`
}

type ListPanelSpec struct {
	SelectedLogFields    []LogField                         `json:"selectedLogFields" validate:"dive"`
	SelectedTracesFields []telemetrytypes.TelemetryFieldKey `json:"selectedTracesFields"`
}

type LogField struct {
	Name     string `json:"name" validate:"required" required:"true"`
	Type     string `json:"type"`
	DataType string `json:"dataType"`
}

// ══════════════════════════════════════════════
// Panel common types
// ══════════════════════════════════════════════

type Axes struct {
	SoftMin    *float64 `json:"softMin"`
	SoftMax    *float64 `json:"softMax"`
	IsLogScale bool     `json:"isLogScale"`
}

type BasicVisualization struct {
	TimePreference TimePreference `json:"timePreference"`
}

type TimeSeriesVisualization struct {
	BasicVisualization
	FillSpans bool `json:"fillSpans"`
}

type BarChartVisualization struct {
	BasicVisualization
	FillSpans       bool `json:"fillSpans"`
	StackedBarChart bool `json:"stackedBarChart"`
}

type PanelFormatting struct {
	Unit             string          `json:"unit"`
	DecimalPrecision PrecisionOption `json:"decimalPrecision"`
}

type TableFormatting struct {
	ColumnUnits      map[string]string `json:"columnUnits"`
	DecimalPrecision PrecisionOption   `json:"decimalPrecision"`
}

type Legend struct {
	Position     LegendPosition    `json:"position"`
	CustomColors map[string]string `json:"customColors"`
}

type ThresholdWithLabel struct {
	Value float64 `json:"value" validate:"required" required:"true"`
	Unit  string  `json:"unit"`
	Color string  `json:"color" validate:"required" required:"true"`
	Label string  `json:"label" validate:"required" required:"true"`
}

type ComparisonThreshold struct {
	Value    float64            `json:"value" validate:"required" required:"true"`
	Operator ComparisonOperator `json:"operator" validate:"required" required:"true"`
	Unit     string             `json:"unit"`
	Color    string             `json:"color" validate:"required" required:"true"`
	Format   ThresholdFormat    `json:"format"`
}

type TableThreshold struct {
	ComparisonThreshold
	ColumnName string `json:"columnName" validate:"required" required:"true"`
}

// ══════════════════════════════════════════════
// Constrained scalar types (enum validation via custom UnmarshalJSON)
// ══════════════════════════════════════════════

// LineInterpolation: "linear" | "spline" | "stepAfter" | "stepBefore". Default is "spline".
type LineInterpolation struct {
	value string
}

const (
	LineInterpolationLinear     = "linear"
	LineInterpolationSpline     = "spline"
	LineInterpolationStepAfter  = "stepAfter"
	LineInterpolationStepBefore = "stepBefore"
)

func (li LineInterpolation) Value() string {
	if li.value == "" {
		return LineInterpolationSpline
	}
	return li.value
}

func (li *LineInterpolation) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch v {
	case LineInterpolationLinear, LineInterpolationSpline, LineInterpolationStepAfter, LineInterpolationStepBefore:
		li.value = v
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid line interpolation %q: must be linear, spline, stepAfter, or stepBefore", v)
	}
}

func (li LineInterpolation) MarshalJSON() ([]byte, error) {
	return json.Marshal(li.Value())
}

// LineStyle: "solid" | "dashed". Default is "solid".
type LineStyle struct {
	value string
}

const (
	LineStyleSolid  = "solid"
	LineStyleDashed = "dashed"
)

func (ls LineStyle) Value() string {
	if ls.value == "" {
		return LineStyleSolid
	}
	return ls.value
}

func (ls *LineStyle) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch v {
	case LineStyleSolid, LineStyleDashed:
		ls.value = v
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid line style %q: must be solid or dashed", v)
	}
}

func (ls LineStyle) MarshalJSON() ([]byte, error) {
	return json.Marshal(ls.Value())
}

// FillMode: "solid" | "gradient" | "none". Default is "solid".
type FillMode struct {
	value string
}

const (
	FillModeSolid    = "solid"
	FillModeGradient = "gradient"
	FillModeNone     = "none"
)

func (fm FillMode) Value() string {
	if fm.value == "" {
		return FillModeSolid
	}
	return fm.value
}

func (fm *FillMode) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch v {
	case FillModeSolid, FillModeGradient, FillModeNone:
		fm.value = v
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid fill mode %q: must be solid, gradient, or none", v)
	}
}

func (fm FillMode) MarshalJSON() ([]byte, error) {
	return json.Marshal(fm.Value())
}

// TimePreference: "globalTime" | "last5Min" | "last15Min" | "last30Min" | "last1Hr" | "last6Hr" | "last1Day" | "last3Days" | "last1Week" | "last1Month".
type TimePreference string

const (
	TimePreferenceGlobalTime TimePreference = "globalTime"
	TimePreferenceLast5Min   TimePreference = "last5Min"
	TimePreferenceLast15Min  TimePreference = "last15Min"
	TimePreferenceLast30Min  TimePreference = "last30Min"
	TimePreferenceLast1Hr    TimePreference = "last1Hr"
	TimePreferenceLast6Hr    TimePreference = "last6Hr"
	TimePreferenceLast1Day   TimePreference = "last1Day"
	TimePreferenceLast3Days  TimePreference = "last3Days"
	TimePreferenceLast1Week  TimePreference = "last1Week"
	TimePreferenceLast1Month TimePreference = "last1Month"
)

func (t *TimePreference) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch TimePreference(v) {
	case TimePreferenceGlobalTime, TimePreferenceLast5Min, TimePreferenceLast15Min, TimePreferenceLast30Min, TimePreferenceLast1Hr, TimePreferenceLast6Hr, TimePreferenceLast1Day, TimePreferenceLast3Days, TimePreferenceLast1Week, TimePreferenceLast1Month:
		*t = TimePreference(v)
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid timePreference %q", v)
	}
}

// LegendPosition: "bottom" | "right".
type LegendPosition string

const (
	LegendPositionBottom LegendPosition = "bottom"
	LegendPositionRight  LegendPosition = "right"
)

func (l *LegendPosition) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch LegendPosition(v) {
	case LegendPositionBottom, LegendPositionRight:
		*l = LegendPosition(v)
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid legend position %q: must be bottom or right", v)
	}
}

// ThresholdFormat: "Text" | "Background".
type ThresholdFormat string

const (
	ThresholdFormatText       ThresholdFormat = "Text"
	ThresholdFormatBackground ThresholdFormat = "Background"
)

func (f *ThresholdFormat) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch ThresholdFormat(v) {
	case ThresholdFormatText, ThresholdFormatBackground:
		*f = ThresholdFormat(v)
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid threshold format %q: must be Text or Background", v)
	}
}

// ComparisonOperator: ">" | "<" | ">=" | "<=" | "=" | "above" | "below" | "above_or_equal" | "below_or_equal" | "equal" | "not_equal".
// We don't use ruletypes.CompareOperator here because it uses valuer.String
// which accepts any string at unmarshal time, bypassing validation.
type ComparisonOperator string

const (
	ComparisonOperatorGT           ComparisonOperator = ">"
	ComparisonOperatorLT           ComparisonOperator = "<"
	ComparisonOperatorGTE          ComparisonOperator = ">="
	ComparisonOperatorLTE          ComparisonOperator = "<="
	ComparisonOperatorEQ           ComparisonOperator = "="
	ComparisonOperatorAbove        ComparisonOperator = "above"
	ComparisonOperatorBelow        ComparisonOperator = "below"
	ComparisonOperatorAboveOrEqual ComparisonOperator = "above_or_equal"
	ComparisonOperatorBelowOrEqual ComparisonOperator = "below_or_equal"
	ComparisonOperatorEqual        ComparisonOperator = "equal"
	ComparisonOperatorNotEqual     ComparisonOperator = "not_equal"
)

func (o *ComparisonOperator) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch ComparisonOperator(v) {
	case ComparisonOperatorGT, ComparisonOperatorLT, ComparisonOperatorGTE, ComparisonOperatorLTE, ComparisonOperatorEQ,
		ComparisonOperatorAbove, ComparisonOperatorBelow, ComparisonOperatorAboveOrEqual, ComparisonOperatorBelowOrEqual,
		ComparisonOperatorEqual, ComparisonOperatorNotEqual:
		*o = ComparisonOperator(v)
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid comparison operator %q", v)
	}
}

// SpanGaps: bool | number. Default is true.
// When true, lines connect across null values. When false, lines break at nulls.
// When a number, gaps smaller than that threshold (in seconds) are connected.
type SpanGaps struct {
	value any
}

func (sg SpanGaps) Value() any {
	if sg.value == nil {
		return true
	}
	return sg.value
}

func (sg *SpanGaps) UnmarshalJSON(data []byte) error {
	var b bool
	if err := json.Unmarshal(data, &b); err == nil {
		sg.value = b
		return nil
	}
	var n float64
	if err := json.Unmarshal(data, &n); err == nil {
		if n < 0 {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid spanGaps %v: numeric value must be non-negative", n)
		}
		sg.value = n
		return nil
	}
	return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid spanGaps: must be a bool or a non-negative number")
}

func (sg SpanGaps) MarshalJSON() ([]byte, error) {
	return json.Marshal(sg.Value())
}

// PrecisionOption: "0" | "1" | "2" | "3" | "4" | "full". Default is "2".
type PrecisionOption struct {
	value string
}

const (
	PrecisionOption0    = "0"
	PrecisionOption1    = "1"
	PrecisionOption2    = "2"
	PrecisionOption3    = "3"
	PrecisionOption4    = "4"
	PrecisionOptionFull = "full"
)

func (p PrecisionOption) Value() string {
	if p.value == "" {
		return PrecisionOption2
	}
	return p.value
}

func (p *PrecisionOption) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	switch v {
	case PrecisionOption0, PrecisionOption1, PrecisionOption2, PrecisionOption3, PrecisionOption4, PrecisionOptionFull:
		p.value = v
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid precision option %q: must be 0, 1, 2, 3, 4, or full", v)
	}
}

func (p PrecisionOption) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.Value())
}
