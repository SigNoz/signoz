package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	signozjsonschema "github.com/SigNoz/signoz/pkg/jsonschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

type QueryEnvelope struct {
	// Type is the type of the query.
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	// Spec is the deferred decoding of the query if any.
	Spec any `json:"spec"`
}

// builderQuerySpec is a signal-discriminated oneOf of the three
// QueryBuilderQuery[T]; schema-only (runtime dispatch is in QueryEnvelope.UnmarshalJSON).
type builderQuerySpec struct{}

var (
	_ jsonschema.OneOfExposer = builderQuerySpec{}
	_ jsonschema.Preparer     = builderQuerySpec{}
)

func (builderQuerySpec) JSONSchemaOneOf() []any {
	return []any{
		QueryBuilderQuery[TraceAggregation]{},
		QueryBuilderQuery[LogAggregation]{},
		QueryBuilderQuery[MetricAggregation]{},
	}
}

func (builderQuerySpec) PrepareJSONSchema(s *jsonschema.Schema) error {
	if s.ExtraProperties == nil {
		s.ExtraProperties = map[string]any{}
	}
	s.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "signal",
		"mapping": map[string]string{
			telemetrytypes.SignalTraces.StringValue():  "#/components/schemas/Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregation",
			telemetrytypes.SignalLogs.StringValue():    "#/components/schemas/Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregation",
			telemetrytypes.SignalMetrics.StringValue(): "#/components/schemas/Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregation",
		},
	}
	return nil
}

// queryEnvelopeBuilder is the OpenAPI schema for a builder_query QueryEnvelope
// (spec is the signal-discriminated builderQuerySpec). `type` is required:"true"
// on every variant so oapi-codegen renders the discriminator non-pointer.
type queryEnvelopeBuilder struct {
	Type QueryType        `json:"type" required:"true" description:"The type of the query."`
	Spec builderQuerySpec `json:"spec" description:"The builder query specification."`
}

// queryEnvelopeFormula is the OpenAPI schema for a QueryEnvelope with type=builder_formula.
type queryEnvelopeFormula struct {
	Type QueryType           `json:"type" required:"true" description:"The type of the query."`
	Spec QueryBuilderFormula `json:"spec" description:"The formula specification."`
}

// queryEnvelopeJoin (builder_join) is deferred: its aggregations are an
// undiscriminable oneOf (see JoinAggregation in join.go). Re-add to
// JSONSchemaOneOf and the discriminator mapping when joins are supported.
// type queryEnvelopeJoin struct {
// 	Type QueryType        `json:"type" required:"true" description:"The type of the query."`
// 	Spec QueryBuilderJoin `json:"spec" description:"The join specification."`
// }

// queryEnvelopeTraceOperator is the OpenAPI schema for a QueryEnvelope with type=builder_trace_operator.
type queryEnvelopeTraceOperator struct {
	Type QueryType                 `json:"type" required:"true" description:"The type of the query."`
	Spec QueryBuilderTraceOperator `json:"spec" description:"The trace operator specification."`
}

// queryEnvelopePromQL is the OpenAPI schema for a QueryEnvelope with type=promql.
type queryEnvelopePromQL struct {
	Type QueryType `json:"type" required:"true" description:"The type of the query."`
	Spec PromQuery `json:"spec" description:"The PromQL query specification."`
}

// queryEnvelopeClickHouseSQL is the OpenAPI schema for a QueryEnvelope with type=clickhouse_sql.
type queryEnvelopeClickHouseSQL struct {
	Type QueryType       `json:"type" required:"true" description:"The type of the query."`
	Spec ClickHouseQuery `json:"spec" description:"The ClickHouse SQL query specification."`
}

var _ jsonschema.OneOfExposer = QueryEnvelope{}

// JSONSchemaOneOf returns the variants of the QueryEnvelope discriminated union.
func (QueryEnvelope) JSONSchemaOneOf() []any {
	return []any{
		queryEnvelopeBuilder{},
		queryEnvelopeFormula{},
		// queryEnvelopeJoin{}, // deferred — see commented queryEnvelopeJoin above
		queryEnvelopeTraceOperator{},
		queryEnvelopePromQL{},
		queryEnvelopeClickHouseSQL{},
	}
}

var _ jsonschema.Preparer = QueryEnvelope{}

// PrepareJSONSchema marks the envelope as a `type`-discriminated union;
// signoz.attachDiscriminators promotes it and strips the base properties.
func (QueryEnvelope) PrepareJSONSchema(s *jsonschema.Schema) error {
	if s.ExtraProperties == nil {
		s.ExtraProperties = map[string]any{}
	}
	s.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "type",
		"mapping": map[string]string{
			QueryTypeBuilder.StringValue():       "#/components/schemas/Querybuildertypesv5QueryEnvelopeBuilder",
			QueryTypeFormula.StringValue():       "#/components/schemas/Querybuildertypesv5QueryEnvelopeFormula",
			QueryTypeTraceOperator.StringValue(): "#/components/schemas/Querybuildertypesv5QueryEnvelopeTraceOperator",
			QueryTypePromQL.StringValue():        "#/components/schemas/Querybuildertypesv5QueryEnvelopePromQL",
			QueryTypeClickHouseSQL.StringValue(): "#/components/schemas/Querybuildertypesv5QueryEnvelopeClickHouseSQL",
		},
	}
	return nil
}

// implement custom json unmarshaler for the QueryEnvelope.
func (q *QueryEnvelope) UnmarshalJSON(data []byte) error {
	var shadow struct {
		Type QueryType       `json:"type"`
		Spec json.RawMessage `json:"spec"`
	}
	if err := binding.JSON.BindBody(bytes.NewReader(data), &shadow, binding.WithDisallowUnknownFields(true)); err != nil {
		return err
	}

	q.Type = shadow.Type

	// 2. Decode the spec based on the Type.
	switch shadow.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		spec, err := UnmarshalBuilderQueryBySignal(shadow.Spec)
		if err != nil {
			return err
		}
		q.Spec = spec

	case QueryTypeFormula:
		var spec QueryBuilderFormula
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return err
		}
		q.Spec = spec

	case QueryTypeJoin:
		var spec QueryBuilderJoin
		// TODO(srikanthccv): use json.Unmarshal here after implementing custom unmarshaler for QueryBuilderJoin
		if err := binding.JSON.BindBody(bytes.NewReader(shadow.Spec), &spec, binding.WithDisallowUnknownFields(true), binding.WithUnknownFieldContext("join spec")); err != nil {
			return err
		}
		q.Spec = spec

	case QueryTypeTraceOperator:
		var spec QueryBuilderTraceOperator
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return err
		}
		q.Spec = spec

	case QueryTypePromQL:
		var spec PromQuery
		// TODO(srikanthccv): use json.Unmarshal here after implementing custom unmarshaler for PromQuery
		if err := binding.JSON.BindBody(bytes.NewReader(shadow.Spec), &spec, binding.WithDisallowUnknownFields(true), binding.WithUnknownFieldContext("PromQL spec")); err != nil {
			return err
		}
		q.Spec = spec

	case QueryTypeClickHouseSQL:
		var spec ClickHouseQuery
		// TODO(srikanthccv): use json.Unmarshal here after implementing custom unmarshaler for ClickHouseQuery
		if err := binding.JSON.BindBody(bytes.NewReader(shadow.Spec), &spec, binding.WithDisallowUnknownFields(true), binding.WithUnknownFieldContext("ClickHouse SQL spec")); err != nil {
			return err
		}
		q.Spec = spec

	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"unknown query type %q",
			shadow.Type,
		).WithAdditional(
			"Valid query types are: builder_query, builder_sub_query, builder_formula, builder_join, builder_trace_operator, promql, clickhouse_sql",
		).WithSuggestions(errors.NewValidReferences(errors.NounQueryTypes, QueryType{}.Enum()...))
	}

	return nil
}

// UnmarshalBuilderQueryBySignal peeks at the "signal" field in the JSON data and
// unmarshals into the correct generic QueryBuilderQuery type. Returns the typed spec.
func UnmarshalBuilderQueryBySignal(data []byte) (any, error) {
	var header struct {
		Signal telemetrytypes.Signal `json:"signal"`
	}
	if err := json.Unmarshal(data, &header); err != nil {
		return nil, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"cannot detect builder signal: %v",
			err,
		)
	}

	switch header.Signal {
	case telemetrytypes.SignalTraces:
		var spec QueryBuilderQuery[TraceAggregation]
		if err := json.Unmarshal(data, &spec); err != nil {
			return nil, err
		}
		return spec, nil
	case telemetrytypes.SignalLogs:
		var spec QueryBuilderQuery[LogAggregation]
		if err := json.Unmarshal(data, &spec); err != nil {
			return nil, err
		}
		return spec, nil
	case telemetrytypes.SignalMetrics:
		var spec QueryBuilderQuery[MetricAggregation]
		if err := json.Unmarshal(data, &spec); err != nil {
			return nil, err
		}
		return spec, nil
	default:
		return nil, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid signal %q",
			header.Signal.StringValue(),
		).WithSuggestions(errors.NewValidReferences(errors.NounSignals, telemetrytypes.Signal{}.Enum()...))
	}
}

type CompositeQuery struct {
	// Queries is the queries to use for the request.
	Queries []QueryEnvelope `json:"queries"`
}

// PrepareJSONSchema adds description to the CompositeQuery schema.
func (c *CompositeQuery) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.")
	return nil
}

// UnmarshalJSON implements custom JSON unmarshaling to provide better error messages.
func (c *CompositeQuery) UnmarshalJSON(data []byte) error {
	type Alias CompositeQuery

	// First do a normal unmarshal without DisallowUnknownFields
	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Then check for unknown fields at this level only
	var check map[string]json.RawMessage
	if err := json.Unmarshal(data, &check); err != nil {
		return err
	}

	// Valid field names are derived from the struct itself so this stays in
	// sync with the schema (and the generated OpenAPI spec) automatically.
	fieldNames := signozjsonschema.JSONFieldNames((*CompositeQuery)(nil))
	validFields := make(map[string]bool, len(fieldNames))
	for _, f := range fieldNames {
		validFields[f] = true
	}

	for field := range check {
		if !validFields[field] {
			unknownFieldErr := errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q in composite query",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			).WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field, errors.NounFields, fieldNames)...)
			return unknownFieldErr
		}
	}

	*c = CompositeQuery(temp)
	return nil
}

type VariableType struct{ valuer.String }

var (
	QueryVariableType   = VariableType{valuer.NewString("query")}
	DynamicVariableType = VariableType{valuer.NewString("dynamic")}
	CustomVariableType  = VariableType{valuer.NewString("custom")}
	TextBoxVariableType = VariableType{valuer.NewString("text")}
)

// Enum returns the acceptable values for VariableType.
func (VariableType) Enum() []any {
	return []any{
		QueryVariableType,
		DynamicVariableType,
		CustomVariableType,
		TextBoxVariableType,
	}
}

type VariableItem struct {
	Type  VariableType `json:"type"`
	Value any          `json:"value"`
}

var _ jsonschema.Preparer = VariableItem{}

// PrepareJSONSchema types `value` as a scalar-or-scalar-list instead of an
// untyped {}. The Go field stays `any`; this only shapes the generated schema.
func (VariableItem) PrepareJSONSchema(s *jsonschema.Schema) error {
	if _, ok := s.Properties["value"]; !ok {
		return nil
	}

	item := jsonschema.Schema{}
	item.OneOf = []jsonschema.SchemaOrBool{
		jsonschema.String.ToSchemaOrBool(),
		jsonschema.Number.ToSchemaOrBool(),
		jsonschema.Boolean.ToSchemaOrBool(),
	}

	list := jsonschema.Schema{}
	list.WithType(jsonschema.Array.Type())
	items := jsonschema.Items{}
	items.WithSchemaOrBool(item.ToSchemaOrBool())
	list.WithItems(items)

	value := jsonschema.Schema{}
	value.OneOf = []jsonschema.SchemaOrBool{
		jsonschema.String.ToSchemaOrBool(),
		jsonschema.Number.ToSchemaOrBool(),
		jsonschema.Boolean.ToSchemaOrBool(),
		list.ToSchemaOrBool(),
	}
	s.Properties["value"] = value.ToSchemaOrBool()

	return nil
}

type QueryRangeRequest struct {
	// SchemaVersion is the version of the schema to use for the request payload.
	SchemaVersion string `json:"schemaVersion"`
	// Start is the start time of the query in epoch milliseconds.
	Start uint64 `json:"start"`
	// End is the end time of the query in epoch milliseconds.
	End uint64 `json:"end"`
	// RequestType is the type of the request.
	RequestType RequestType `json:"requestType"`
	// CompositeQuery is the composite query to use for the request.
	CompositeQuery CompositeQuery `json:"compositeQuery"`
	// Variables is the variables to use for the request.
	Variables map[string]VariableItem `json:"variables,omitempty"`

	// NoCache is a flag to disable caching for the request.
	NoCache bool `json:"noCache,omitempty"`

	FormatOptions *FormatOptions `json:"formatOptions,omitempty"`
}

// PrepareJSONSchema adds description to the QueryRangeRequest schema.
func (q *QueryRangeRequest) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Request body for the v5 query range endpoint. Supports builder queries (traces, logs, metrics), formulas, joins, trace operators, PromQL, and ClickHouse SQL queries.")
	return nil
}

func (r *QueryRangeRequest) StepIntervalForQuery(name string) (int64, error) {
	stepsMap := make(map[string]int64)
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			stepsMap[spec.Name] = spec.StepInterval.Milliseconds()
		case QueryBuilderQuery[LogAggregation]:
			stepsMap[spec.Name] = spec.StepInterval.Milliseconds()
		case QueryBuilderQuery[MetricAggregation]:
			stepsMap[spec.Name] = spec.StepInterval.Milliseconds()
		case PromQuery:
			stepsMap[spec.Name] = spec.Step.Milliseconds()
		case QueryBuilderTraceOperator:
			stepsMap[spec.Name] = spec.StepInterval.Milliseconds()
		}
	}

	if step, ok := stepsMap[name]; ok {
		return step, nil
	}

	exprStr := ""

	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderFormula:
			if spec.Name == name {
				exprStr = spec.Expression
			}
		}
	}

	expression, err := govaluate.NewEvaluableExpressionWithFunctions(exprStr, EvalFuncs())
	if err != nil {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse expression for formula query %q: %s", name, err.Error())
	}
	steps := []int64{}
	for _, v := range expression.Vars() {
		steps = append(steps, stepsMap[v])
	}
	return LCMList(steps), nil
}

func (r *QueryRangeRequest) NumAggregationForQuery(name string) int64 {
	numAgg := 0
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			if spec.Name == name {
				numAgg += 1
			}
		case QueryBuilderQuery[LogAggregation]:
			if spec.Name == name {
				numAgg += 1
			}
		case QueryBuilderQuery[MetricAggregation]:
			if spec.Name == name {
				numAgg += 1
			}
		case QueryBuilderFormula:
			if spec.Name == name {
				numAgg += 1
			}
		}
	}
	return int64(numAgg)
}

// HasOrderSpecified returns true if any query has an explicit order provided.
func (r *QueryRangeRequest) HasOrderSpecified() bool {
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			if len(spec.Order) > 0 {
				return true
			}
		case QueryBuilderQuery[LogAggregation]:
			if len(spec.Order) > 0 {
				return true
			}
		case QueryBuilderQuery[MetricAggregation]:
			if len(spec.Order) > 0 {
				return true
			}
		case QueryBuilderFormula:
			if len(spec.Order) > 0 {
				return true
			}
		}
	}
	return false
}

// UseDefaultOrderBy applies UseDefaultOrderByForListQuery to every query in the
// composite query when the request type is a list query (raw, raw_stream, trace).
func (r *QueryRangeRequest) UseDefaultOrderBy() {

	// Based on the request type, handle default order-bys
	switch r.RequestType {
	case RequestTypeRaw, RequestTypeRawStream, RequestTypeTrace:
		for idx := range r.CompositeQuery.Queries {
			r.CompositeQuery.Queries[idx].UseDefaultOrderByForListQuery()
		}
	}

}

// UseDefaultOrderByForListQuery applies a default timestamp-descending order
// for list/raw queries when no explicit order is specified. This is intended
// for raw data listing endpoints (e.g. export, list views) where a sensible
// default sort is needed, not for aggregation or timeseries queries.
func (q *QueryEnvelope) UseDefaultOrderByForListQuery() {
	if len(q.GetOrder()) > 0 {
		return
	}

	switch q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation],
		QueryBuilderTraceOperator:
		q.SetOrder(
			[]OrderBy{
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "timestamp",
							Signal:        telemetrytypes.SignalTraces,
							FieldContext:  telemetrytypes.FieldContextSpan,
							FieldDataType: telemetrytypes.FieldDataTypeNumber,
						},
					},
					Direction: OrderDirectionDesc,
				},
			},
		)
	case QueryBuilderQuery[LogAggregation]:
		q.SetOrder(
			[]OrderBy{
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "timestamp",
							Signal:        telemetrytypes.SignalLogs,
							FieldContext:  telemetrytypes.FieldContextLog,
							FieldDataType: telemetrytypes.FieldDataTypeNumber,
						},
					},
					Direction: OrderDirectionDesc,
				},
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "id",
							Signal:        telemetrytypes.SignalLogs,
							FieldContext:  telemetrytypes.FieldContextLog,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
					Direction: OrderDirectionDesc,
				},
			},
		)
	}
}

func (r *QueryRangeRequest) FuncsForQuery(name string) []Function {
	funcs := []Function{}
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			if spec.Name == name {
				funcs = spec.Functions
			}
		case QueryBuilderQuery[LogAggregation]:
			if spec.Name == name {
				funcs = spec.Functions
			}
		case QueryBuilderQuery[MetricAggregation]:
			if spec.Name == name {
				funcs = spec.Functions
			}
		case QueryBuilderFormula:
			if spec.Name == name {
				funcs = spec.Functions
			}
		}
	}
	return funcs
}

func (r *QueryRangeRequest) IsAnomalyRequest() (*QueryBuilderQuery[MetricAggregation], bool) {
	hasAnomaly := false
	var q QueryBuilderQuery[MetricAggregation]
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		// only metrics support anomaly right now
		case QueryBuilderQuery[MetricAggregation]:
			for _, f := range spec.Functions {
				if f.Name == FunctionNameAnomaly {
					hasAnomaly = true
					q = spec
				}
			}
		}
	}

	return &q, hasAnomaly
}

func (r *QueryRangeRequest) TraceOperatorQueryIndex() int {
	for idx, query := range r.CompositeQuery.Queries {
		switch query.Spec.(type) {
		case QueryBuilderTraceOperator:
			return idx
		}
	}
	return -1
}

// We do not support fill gaps for these queries. Maybe support in future?
func (r *QueryRangeRequest) SkipFillGaps(name string) bool {
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case PromQuery:
			if spec.Name == name {
				return true
			}
		case ClickHouseQuery:
			if spec.Name == name {
				return true
			}
		}
	}
	return false
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields.
func (r *QueryRangeRequest) UnmarshalJSON(data []byte) error {
	// Define a type alias to avoid infinite recursion
	type Alias QueryRangeRequest

	// First do a normal unmarshal without DisallowUnknownFields to let nested structures handle their own validation
	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Then check for unknown fields at this level only
	var check map[string]json.RawMessage
	if err := json.Unmarshal(data, &check); err != nil {
		return err
	}

	// Valid field names are derived from the struct itself so this stays in
	// sync with the schema (and the generated OpenAPI spec) automatically.
	fieldNames := signozjsonschema.JSONFieldNames((*QueryRangeRequest)(nil))
	validFields := make(map[string]bool, len(fieldNames))
	for _, f := range fieldNames {
		validFields[f] = true
	}

	for field := range check {
		if !validFields[field] {
			unknownFieldErr := errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			).WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field, errors.NounFields, fieldNames)...)
			return unknownFieldErr
		}
	}

	// Copy the decoded values back to the original struct
	*r = QueryRangeRequest(temp)

	return nil
}

type FormatOptions struct {
	FillGaps               bool `json:"fillGaps,omitempty"`
	FormatTableResultForUI bool `json:"formatTableResultForUI,omitempty"`
}

func (r *QueryRangeRequest) GetQueriesSupportingZeroDefault() map[string]bool {
	canDefaultZeroAgg := func(expr string) bool {
		expr = strings.ToLower(expr)
		// only pure additive/counting operations should default to zero,
		// while statistical/analytical operations should show gaps when there's no data to analyze.
		// TODO(srikanthccv): use newExprVisitor for getting the function used in the expression
		if strings.HasPrefix(expr, "count(") ||
			strings.HasPrefix(expr, "count_distinct(") ||
			strings.HasPrefix(expr, "sum(") ||
			strings.HasPrefix(expr, "rate(") {
			return true
		}
		return false

	}

	canDefaultZero := make(map[string]bool)
	for _, q := range r.CompositeQuery.Queries {
		if q.Type == QueryTypeBuilder {
			switch spec := q.Spec.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				if len(spec.Aggregations) == 1 && canDefaultZeroAgg(spec.Aggregations[0].Expression) {
					canDefaultZero[spec.Name] = true
				}
			case QueryBuilderQuery[LogAggregation]:
				if len(spec.Aggregations) == 1 && canDefaultZeroAgg(spec.Aggregations[0].Expression) {
					canDefaultZero[spec.Name] = true
				}
			case QueryBuilderQuery[MetricAggregation]:
				if len(spec.Aggregations) == 1 {
					timeAgg := spec.Aggregations[0].TimeAggregation

					if timeAgg == metrictypes.TimeAggregationCount ||
						timeAgg == metrictypes.TimeAggregationCountDistinct ||
						timeAgg == metrictypes.TimeAggregationRate ||
						timeAgg == metrictypes.TimeAggregationIncrease {
						canDefaultZero[spec.Name] = true
					}
				}
			}
		}
	}

	return canDefaultZero
}
