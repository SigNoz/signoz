package querybuildertypesv5

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type QueryEnvelope struct {
	// Type is the type of the query.
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	// Spec is the deferred decoding of the query if any.
	Spec any `json:"spec"`
}

// implement custom json unmarshaler for the QueryEnvelope
func (q *QueryEnvelope) UnmarshalJSON(data []byte) error {
	var shadow struct {
		Type QueryType       `json:"type"`
		Spec json.RawMessage `json:"spec"`
	}
	if err := UnmarshalJSONWithSuggestions(data, &shadow); err != nil {
		return err
	}

	q.Type = shadow.Type

	// 2. Decode the spec based on the Type.
	switch shadow.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		var header struct {
			Signal telemetrytypes.Signal `json:"signal"`
		}
		if err := json.Unmarshal(shadow.Spec, &header); err != nil {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"cannot detect builder signal: %v",
				err,
			)
		}

		switch header.Signal {
		case telemetrytypes.SignalTraces:
			var spec QueryBuilderQuery[TraceAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				return wrapUnmarshalError(err, "invalid trace builder query spec: %v", err)
			}
			q.Spec = spec
		case telemetrytypes.SignalLogs:
			var spec QueryBuilderQuery[LogAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				return wrapUnmarshalError(err, "invalid log builder query spec: %v", err)
			}
			q.Spec = spec
		case telemetrytypes.SignalMetrics:
			var spec QueryBuilderQuery[MetricAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				return wrapUnmarshalError(err, "invalid metric builder query spec: %v", err)
			}
			q.Spec = spec
		default:
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown builder signal %q",
				header.Signal,
			).WithAdditional(
				"Valid signals are: traces, logs, metrics",
			)
		}

	case QueryTypeFormula:
		var spec QueryBuilderFormula
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "formula spec"); err != nil {
			return wrapUnmarshalError(err, "invalid formula spec: %v", err)
		}
		q.Spec = spec

	case QueryTypeJoin:
		var spec QueryBuilderJoin
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "join spec"); err != nil {
			return wrapUnmarshalError(err, "invalid join spec: %v", err)
		}
		q.Spec = spec

	case QueryTypeTraceOperator:
		var spec QueryBuilderTraceOperator
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "trace operator spec"); err != nil {
			return wrapUnmarshalError(err, "invalid trace operator spec: %v", err)
		}
		q.Spec = spec

	case QueryTypePromQL:
		var spec PromQuery
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "PromQL spec"); err != nil {
			return wrapUnmarshalError(err, "invalid PromQL spec: %v", err)
		}
		q.Spec = spec

	case QueryTypeClickHouseSQL:
		var spec ClickHouseQuery
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "ClickHouse SQL spec"); err != nil {
			return wrapUnmarshalError(err, "invalid ClickHouse SQL spec: %v", err)
		}
		q.Spec = spec

	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"unknown query type %q",
			shadow.Type,
		).WithAdditional(
			"Valid query types are: builder_query, builder_sub_query, builder_formula, builder_join, builder_trace_operator, promql, clickhouse_sql",
		)
	}

	return nil
}

type CompositeQuery struct {
	// Queries is the queries to use for the request.
	Queries []QueryEnvelope `json:"queries"`
}

// UnmarshalJSON implements custom JSON unmarshaling to provide better error messages
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

	// Check for unknown fields at this level
	validFields := map[string]bool{
		"queries": true,
	}

	for field := range check {
		if !validFields[field] {
			// Find closest match
			var fieldNames []string
			for f := range validFields {
				fieldNames = append(fieldNames, f)
			}

			if suggestion, found := telemetrytypes.SuggestCorrection(field, fieldNames); found {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown field %q in composite query",
					field,
				).WithAdditional(
					suggestion,
				)
			}

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q in composite query",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			)
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

type VariableItem struct {
	Type  VariableType `json:"type"`
	Value any          `json:"value"`
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

func (r *QueryRangeRequest) StepIntervalForQuery(name string) int64 {
	stepsMap := make(map[string]int64)
	for _, query := range r.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			stepsMap[spec.Name] = int64(spec.StepInterval.Seconds())
		case QueryBuilderQuery[LogAggregation]:
			stepsMap[spec.Name] = int64(spec.StepInterval.Seconds())
		case QueryBuilderQuery[MetricAggregation]:
			stepsMap[spec.Name] = int64(spec.StepInterval.Seconds())
		case PromQuery:
			stepsMap[spec.Name] = int64(spec.Step.Seconds())
		}
	}

	if step, ok := stepsMap[name]; ok {
		return step
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

	expression, _ := govaluate.NewEvaluableExpressionWithFunctions(exprStr, EvalFuncs())
	steps := []int64{}
	for _, v := range expression.Vars() {
		steps = append(steps, stepsMap[v])
	}
	return LCMList(steps)
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

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields
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

	// Check for unknown fields at the top level
	validFields := map[string]bool{
		"schemaVersion":  true,
		"start":          true,
		"end":            true,
		"requestType":    true,
		"compositeQuery": true,
		"variables":      true,
		"noCache":        true,
		"formatOptions":  true,
	}

	for field := range check {
		if !validFields[field] {
			// Find closest match
			var fieldNames []string
			for f := range validFields {
				fieldNames = append(fieldNames, f)
			}

			if suggestion, found := telemetrytypes.SuggestCorrection(field, fieldNames); found {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown field %q",
					field,
				).WithAdditional(
					suggestion,
				)
			}

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			)
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
		// TODO: use newExprVisitor for getting the function used in the expression
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
