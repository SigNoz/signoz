package dashboardtypes

import (
	"encoding/json"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	// Name is the name of the attribute being fetched dynamically from the
	// signal. This could be extended to a richer selector in the future.
	Name   string                `json:"name" validate:"required" required:"true"`
	Signal telemetrytypes.Signal `json:"signal"`
}

type QueryVariableSpec struct {
	QueryValue string `json:"queryValue" validate:"required" required:"true"`
}

type CustomVariableSpec struct {
	CustomValue string `json:"customValue" validate:"required" required:"true"`
}

// ══════════════════════════════════════════════
// SigNoz query plugin specs — aliased from querybuildertypesv5
// ══════════════════════════════════════════════

type QueryPluginKind string

const (
	QueryKindBuilder       QueryPluginKind = "signoz/BuilderQuery"
	QueryKindComposite     QueryPluginKind = "signoz/CompositeQuery"
	QueryKindFormula       QueryPluginKind = "signoz/Formula"
	QueryKindPromQL        QueryPluginKind = "signoz/PromQLQuery"
	QueryKindClickHouseSQL QueryPluginKind = "signoz/ClickHouseSQL"
	QueryKindTraceOperator QueryPluginKind = "signoz/TraceOperator"
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

// PrepareJSONSchema drops the reflected struct shape so only the
// JSONSchemaOneOf result binds.
func (BuilderQuerySpec) PrepareJSONSchema(s *jsonschema.Schema) error {
	return clearOneOfParentShape(s)
}

// JSONSchemaOneOf exposes the three signal-dispatched shapes a builder query
// can take. Mirrors qb.UnmarshalBuilderQueryBySignal's runtime dispatch.
func (BuilderQuerySpec) JSONSchemaOneOf() []any {
	return []any{
		qb.QueryBuilderQuery[qb.LogAggregation]{},
		qb.QueryBuilderQuery[qb.MetricAggregation]{},
		qb.QueryBuilderQuery[qb.TraceAggregation]{},
	}
}

// ══════════════════════════════════════════════
// SigNoz panel plugin specs
// ══════════════════════════════════════════════

type PanelPluginKind string

const (
	PanelKindTimeSeries PanelPluginKind = "signoz/TimeSeriesPanel"
	PanelKindBarChart   PanelPluginKind = "signoz/BarChartPanel"
	PanelKindNumber     PanelPluginKind = "signoz/NumberPanel"
	PanelKindPieChart   PanelPluginKind = "signoz/PieChartPanel"
	PanelKindTable      PanelPluginKind = "signoz/TablePanel"
	PanelKindHistogram  PanelPluginKind = "signoz/HistogramPanel"
	PanelKindList       PanelPluginKind = "signoz/ListPanel"
)

func (PanelPluginKind) Enum() []any {
	return []any{PanelKindTimeSeries, PanelKindBarChart, PanelKindNumber, PanelKindPieChart, PanelKindTable, PanelKindHistogram, PanelKindList}
}

type DatasourcePluginKind string

const (
	DatasourceKindSigNoz DatasourcePluginKind = "signoz/Datasource"
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
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty" validate:"dive"`
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
	Operator ComparisonOperator `json:"operator"`
	Unit     string             `json:"unit"`
	Color    string             `json:"color" validate:"required" required:"true"`
	Format   ThresholdFormat    `json:"format"`
}

type TableThreshold struct {
	ComparisonThreshold
	ColumnName string `json:"columnName" validate:"required" required:"true"`
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
	if v == "" {
		*t = TimePreferenceGlobalTime
		return nil
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
	if v == "" {
		*l = LegendPositionBottom
		return nil
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
	if v == "" {
		*f = ThresholdFormatText
		return nil
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
	ComparisonOperatorGT           = ComparisonOperator{valuer.NewString(">")} // default
	ComparisonOperatorLT           = ComparisonOperator{valuer.NewString("<")}
	ComparisonOperatorGTE          = ComparisonOperator{valuer.NewString(">=")}
	ComparisonOperatorLTE          = ComparisonOperator{valuer.NewString("<=")}
	ComparisonOperatorEQ           = ComparisonOperator{valuer.NewString("=")}
	ComparisonOperatorAbove        = ComparisonOperator{valuer.NewString("above")}
	ComparisonOperatorBelow        = ComparisonOperator{valuer.NewString("below")}
	ComparisonOperatorAboveOrEqual = ComparisonOperator{valuer.NewString("above_or_equal")}
	ComparisonOperatorBelowOrEqual = ComparisonOperator{valuer.NewString("below_or_equal")}
	ComparisonOperatorEqual        = ComparisonOperator{valuer.NewString("equal")}
	ComparisonOperatorNotEqual     = ComparisonOperator{valuer.NewString("not_equal")}
)

func (ComparisonOperator) Enum() []any {
	return []any{ComparisonOperatorGT, ComparisonOperatorLT, ComparisonOperatorGTE, ComparisonOperatorLTE, ComparisonOperatorEQ, ComparisonOperatorAbove, ComparisonOperatorBelow, ComparisonOperatorAboveOrEqual, ComparisonOperatorBelowOrEqual, ComparisonOperatorEqual, ComparisonOperatorNotEqual}
}

func (o ComparisonOperator) ValueOrDefault() string {
	if o.IsZero() {
		return ComparisonOperatorGT.StringValue()
	}
	return o.StringValue()
}

func (o ComparisonOperator) MarshalJSON() ([]byte, error) {
	return json.Marshal(o.ValueOrDefault())
}

func (o *ComparisonOperator) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid comparison operator: must be a string, one of `>`, `<`, `>=`, `<=`, `=`, `above`, `below`, `above_or_equal`, `below_or_equal`, `equal`, or `not_equal`")
	}
	if v == "" {
		*o = ComparisonOperatorGT
		return nil
	}
	co := ComparisonOperator{valuer.NewString(v)}
	switch co {
	case ComparisonOperatorGT, ComparisonOperatorLT, ComparisonOperatorGTE, ComparisonOperatorLTE, ComparisonOperatorEQ,
		ComparisonOperatorAbove, ComparisonOperatorBelow, ComparisonOperatorAboveOrEqual, ComparisonOperatorBelowOrEqual,
		ComparisonOperatorEqual, ComparisonOperatorNotEqual:
		*o = co
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid comparison operator %q: must be `>`, `<`, `>=`, `<=`, `=`, `above`, `below`, `above_or_equal`, `below_or_equal`, `equal`, or `not_equal`", v)
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
	if v == "" {
		*li = LineInterpolationSpline
		return nil
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
	if v == "" {
		*ls = LineStyleSolid
		return nil
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

type FillMode struct{ valuer.String }

var (
	FillModeSolid    = FillMode{valuer.NewString("solid")} // default
	FillModeGradient = FillMode{valuer.NewString("gradient")}
	FillModeNone     = FillMode{valuer.NewString("none")}
)

func (FillMode) Enum() []any {
	return []any{FillModeSolid, FillModeGradient, FillModeNone}
}

func (fm FillMode) ValueOrDefault() string {
	if fm.IsZero() {
		return FillModeSolid.StringValue()
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
	if v == "" {
		*fm = FillModeSolid
		return nil
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

// SpanGaps controls whether lines connect across null values.
// When FillOnlyBelow is false (default), all gaps are connected.
// When FillOnlyBelow is true, only gaps smaller than FillLessThan are connected.
type SpanGaps struct {
	FillOnlyBelow bool                `json:"fillOnlyBelow"`
	FillLessThan  valuer.TextDuration `json:"fillLessThan"`
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
	if v == "" {
		*p = PrecisionOption2
		return nil
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
