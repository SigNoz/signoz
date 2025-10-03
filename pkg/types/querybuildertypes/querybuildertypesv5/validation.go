package querybuildertypesv5

import (
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// getQueryIdentifier returns a friendly identifier for a query based on its type and name/content
func getQueryIdentifier(envelope QueryEnvelope, index int) string {
	switch envelope.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		switch spec := envelope.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			if spec.Name != "" {
				return fmt.Sprintf("query '%s'", spec.Name)
			}
			return fmt.Sprintf("trace query at position %d", index+1)
		case QueryBuilderQuery[LogAggregation]:
			if spec.Name != "" {
				return fmt.Sprintf("query '%s'", spec.Name)
			}
			return fmt.Sprintf("log query at position %d", index+1)
		case QueryBuilderQuery[MetricAggregation]:
			if spec.Name != "" {
				return fmt.Sprintf("query '%s'", spec.Name)
			}
			return fmt.Sprintf("metric query at position %d", index+1)
		}
	case QueryTypeFormula:
		if spec, ok := envelope.Spec.(QueryBuilderFormula); ok && spec.Name != "" {
			return fmt.Sprintf("formula '%s'", spec.Name)
		}
		return fmt.Sprintf("formula at position %d", index+1)
	case QueryTypeTraceOperator:
		if spec, ok := envelope.Spec.(QueryBuilderTraceOperator); ok && spec.Name != "" {
			return fmt.Sprintf("trace operator '%s'", spec.Name)
		}
		return fmt.Sprintf("trace operator at position %d", index+1)
	case QueryTypeJoin:
		if spec, ok := envelope.Spec.(QueryBuilderJoin); ok && spec.Name != "" {
			return fmt.Sprintf("join '%s'", spec.Name)
		}
		return fmt.Sprintf("join at position %d", index+1)
	case QueryTypePromQL:
		if spec, ok := envelope.Spec.(PromQuery); ok && spec.Name != "" {
			return fmt.Sprintf("PromQL query '%s'", spec.Name)
		}
		return fmt.Sprintf("PromQL query at position %d", index+1)
	case QueryTypeClickHouseSQL:
		if spec, ok := envelope.Spec.(ClickHouseQuery); ok && spec.Name != "" {
			return fmt.Sprintf("ClickHouse query '%s'", spec.Name)
		}
		return fmt.Sprintf("ClickHouse query at position %d", index+1)
	}
	return fmt.Sprintf("query at position %d", index+1)
}

const (
	// Maximum limit for query results
	MaxQueryLimit = 10000
)

// ValidateFunctionName checks if the function name is valid
func ValidateFunctionName(name FunctionName) error {
	validFunctions := []FunctionName{
		FunctionNameCutOffMin,
		FunctionNameCutOffMax,
		FunctionNameClampMin,
		FunctionNameClampMax,
		FunctionNameAbsolute,
		FunctionNameRunningDiff,
		FunctionNameLog2,
		FunctionNameLog10,
		FunctionNameCumulativeSum,
		FunctionNameEWMA3,
		FunctionNameEWMA5,
		FunctionNameEWMA7,
		FunctionNameMedian3,
		FunctionNameMedian5,
		FunctionNameMedian7,
		FunctionNameTimeShift,
		FunctionNameAnomaly,
		FunctionNameFillZero,
	}

	if slices.Contains(validFunctions, name) {
		return nil
	}

	// Format valid functions as comma-separated string
	var validFunctionNames []string
	for _, fn := range validFunctions {
		validFunctionNames = append(validFunctionNames, fn.StringValue())
	}

	return errors.NewInvalidInputf(
		errors.CodeInvalidInput,
		"invalid function name: %s",
		name.StringValue(),
	).WithAdditional(fmt.Sprintf("valid functions are: %s", strings.Join(validFunctionNames, ", ")))
}

// Validate performs preliminary validation on QueryBuilderQuery
func (q *QueryBuilderQuery[T]) Validate(requestType RequestType) error {
	// Validate signal
	if err := q.validateSignal(); err != nil {
		return err
	}

	// Validate aggregations only for non-raw request types
	if requestType != RequestTypeRaw && requestType != RequestTypeRawStream && requestType != RequestTypeTrace {
		if err := q.validateAggregations(); err != nil {
			return err
		}
	}

	// Validate limit and pagination
	if err := q.validateLimitAndPagination(); err != nil {
		return err
	}

	// Validate functions
	if err := q.validateFunctions(); err != nil {
		return err
	}

	// Validate secondary aggregations
	if err := q.validateSecondaryAggregations(); err != nil {
		return err
	}

	if requestType != RequestTypeRaw && requestType != RequestTypeTrace && len(q.Aggregations) > 0 {
		if err := q.validateOrderByForAggregation(); err != nil {
			return err
		}
	} else {
		if err := q.validateOrderBy(); err != nil {
			return err
		}
	}

	if requestType != RequestTypeRaw && requestType != RequestTypeTrace {
		if err := q.validateHaving(); err != nil {
			return err
		}
	}

	if requestType == RequestTypeRaw {
		if err := q.validateSelectFields(); err != nil {
			return err
		}
	}

	return nil
}

func (q *QueryBuilderQuery[T]) validateSelectFields() error {
	// isRoot and isEntryPoint are returned by the Metadata API, so if someone sends them, we have to reject the request.
	for _, v := range q.SelectFields {
		if v.Name == "isRoot" || v.Name == "isEntryPoint" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"isRoot and isEntryPoint fields are not supported in selectFields",
			)
		}
	}
	return nil
}

func (q *QueryBuilderQuery[T]) validateSignal() error {
	// Signal validation is handled during unmarshaling in req.go
	// Valid signals are: metrics, traces, logs
	switch q.Signal {
	case telemetrytypes.SignalMetrics,
		telemetrytypes.SignalTraces,
		telemetrytypes.SignalLogs,
		telemetrytypes.SignalUnspecified: // Empty is allowed for backward compatibility
		return nil
	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid signal type: %s",
			q.Signal,
		).WithAdditional(
			"Valid signals are: metrics, traces, logs",
		)
	}
}

func (q *QueryBuilderQuery[T]) validateAggregations() error {
	// At least one aggregation required for non-disabled queries
	if len(q.Aggregations) == 0 && !q.Disabled {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"at least one aggregation is required",
		)
		// TODO: add url with docs
	}

	// Check for duplicate aliases
	aliases := make(map[string]bool)
	for i, agg := range q.Aggregations {
		// Type-specific validation based on T
		switch v := any(agg).(type) {
		case MetricAggregation:
			if v.MetricName == "" {
				aggId := fmt.Sprintf("aggregation #%d", i+1)
				if q.Name != "" {
					aggId = fmt.Sprintf("aggregation #%d in query '%s'", i+1, q.Name)
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"metric name is required for %s",
					aggId,
				)
			}
			// Validate metric-specific aggregations
			if err := validateMetricAggregation(v); err != nil {
				aggId := fmt.Sprintf("aggregation #%d", i+1)
				if q.Name != "" {
					aggId = fmt.Sprintf("aggregation #%d in query '%s'", i+1, q.Name)
				}
				return wrapValidationError(err, aggId, "invalid metric %s: %s")
			}
		case TraceAggregation:
			if v.Expression == "" {
				aggId := fmt.Sprintf("aggregation #%d", i+1)
				if q.Name != "" {
					aggId = fmt.Sprintf("aggregation #%d in query '%s'", i+1, q.Name)
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"expression is required for trace %s",
					aggId,
				)
			}
			if v.Alias != "" {
				if aliases[v.Alias] {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"duplicate aggregation alias: %s",
						v.Alias,
					)
				}
				aliases[v.Alias] = true
			}
		case LogAggregation:
			if v.Expression == "" {
				aggId := fmt.Sprintf("aggregation #%d", i+1)
				if q.Name != "" {
					aggId = fmt.Sprintf("aggregation #%d in query '%s'", i+1, q.Name)
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"expression is required for log %s",
					aggId,
				)
			}
			if v.Alias != "" {
				if aliases[v.Alias] {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"duplicate aggregation alias: %s",
						v.Alias,
					)
				}
				aliases[v.Alias] = true
			}
		}
	}

	return nil
}

func (q *QueryBuilderQuery[T]) validateLimitAndPagination() error {
	// Validate limit
	if q.Limit < 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"limit must be non-negative, got %d",
			q.Limit,
		)
	}

	if q.Limit > MaxQueryLimit {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"limit exceeds maximum allowed value of %d",
			MaxQueryLimit,
		).WithAdditional(
			fmt.Sprintf("Provided limit: %d", q.Limit),
		)
	}

	// Validate offset
	if q.Offset < 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"offset must be non-negative, got %d",
			q.Offset,
		)
	}

	return nil
}

func (q *QueryBuilderQuery[T]) validateFunctions() error {
	for i, fn := range q.Functions {
		if err := ValidateFunctionName(fn.Name); err != nil {
			fnId := fmt.Sprintf("function #%d", i+1)
			if q.Name != "" {
				fnId = fmt.Sprintf("function #%d in query '%s'", i+1, q.Name)
			}
			return wrapValidationError(err, fnId, "invalid %s: %s")
		}
	}
	return nil
}

func (q *QueryBuilderQuery[T]) validateSecondaryAggregations() error {
	for i, secAgg := range q.SecondaryAggregations {
		// Secondary aggregation expression can be empty - we allow it per requirements
		// Just validate structure
		if secAgg.Limit < 0 {
			secAggId := fmt.Sprintf("secondary aggregation #%d", i+1)
			if q.Name != "" {
				secAggId = fmt.Sprintf("secondary aggregation #%d in query '%s'", i+1, q.Name)
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"%s: limit must be non-negative",
				secAggId,
			)
		}
	}
	return nil
}

func (q *QueryBuilderQuery[T]) validateOrderBy() error {
	for i, order := range q.Order {
		// Direction validation is handled by the OrderDirection type
		if order.Direction != OrderDirectionAsc && order.Direction != OrderDirectionDesc {
			orderId := fmt.Sprintf("order by clause #%d", i+1)
			if q.Name != "" {
				orderId = fmt.Sprintf("order by clause #%d in query '%s'", i+1, q.Name)
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid direction for %s: %s",
				orderId,
				order.Direction.StringValue(),
			).WithAdditional(
				"Valid directions are: asc, desc",
			)
		}
	}
	return nil
}

// validateOrderByForAggregation validates order by clauses for aggregation queries
// For aggregation queries, order by can only reference:
// 1. Group by keys
// 2. Aggregation expressions or aliases
// 3. Aggregation index (0, 1, 2, etc.)
func (q *QueryBuilderQuery[T]) validateOrderByForAggregation() error {
	// First validate basic order by constraints
	if err := q.validateOrderBy(); err != nil {
		return err
	}

	validOrderKeys := make(map[string]bool)

	for _, gb := range q.GroupBy {
		validOrderKeys[gb.TelemetryFieldKey.Name] = true
	}

	for i, agg := range q.Aggregations {
		validOrderKeys[fmt.Sprintf("%d", i)] = true

		switch v := any(agg).(type) {
		case TraceAggregation:
			if v.Alias != "" {
				validOrderKeys[v.Alias] = true
			}
			validOrderKeys[v.Expression] = true
		case LogAggregation:
			if v.Alias != "" {
				validOrderKeys[v.Alias] = true
			}
			validOrderKeys[v.Expression] = true
		case MetricAggregation:
			// Also allow the generic __result pattern
			validOrderKeys["__result"] = true

			validOrderKeys[fmt.Sprintf("%s(%s)", v.SpaceAggregation.StringValue(), v.MetricName)] = true
			if v.TimeAggregation != metrictypes.TimeAggregationUnspecified {
				validOrderKeys[fmt.Sprintf("%s(%s)", v.TimeAggregation.StringValue(), v.MetricName)] = true
			}
			if v.TimeAggregation != metrictypes.TimeAggregationUnspecified && v.SpaceAggregation != metrictypes.SpaceAggregationUnspecified {
				validOrderKeys[fmt.Sprintf("%s(%s(%s))", v.SpaceAggregation.StringValue(), v.TimeAggregation.StringValue(), v.MetricName)] = true
			}
		}
	}

	for i, order := range q.Order {
		orderKey := order.Key.Name

		if !validOrderKeys[orderKey] {
			orderId := fmt.Sprintf("order by clause #%d", i+1)
			if q.Name != "" {
				orderId = fmt.Sprintf("order by clause #%d in query '%s'", i+1, q.Name)
			}

			validKeys := []string{}
			for k := range validOrderKeys {
				validKeys = append(validKeys, k)
			}
			slices.Sort(validKeys)

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid order by key '%s' for %s",
				orderKey,
				orderId,
			).WithAdditional(
				fmt.Sprintf("For aggregation queries, order by can only reference group by keys, aggregation aliases/expressions, or aggregation indices. Valid keys are: %s", strings.Join(validKeys, ", ")),
			)
		}
	}

	return nil
}

func (q *QueryBuilderQuery[T]) validateHaving() error {
	if q.Having == nil || q.Having.Expression == "" {
		return nil
	}

	// ensure that having is only used with aggregations
	if len(q.Aggregations) == 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"having clause can only be used with aggregation queries. Use `filter.expression` instead",
		)
	}

	return nil
}

// ValidateQueryRangeRequest validates the entire query range request
func (r *QueryRangeRequest) Validate() error {
	// Validate time range
	if r.RequestType != RequestTypeRawStream && r.Start >= r.End {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"start time must be before end time",
		)
	}

	// Validate request type
	switch r.RequestType {
	case RequestTypeRaw, RequestTypeRawStream, RequestTypeTimeSeries, RequestTypeScalar, RequestTypeTrace:
		// Valid request types
	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid request type: %s",
			r.RequestType,
		).WithAdditional(
			"Valid request types are: raw, timeseries, scalar",
		)
	}

	// Validate composite query
	if err := r.validateCompositeQuery(); err != nil {
		return err
	}

	// Check if all queries are disabled
	if err := r.validateAllQueriesNotDisabled(); err != nil {
		return err
	}

	return nil
}

// validateAllQueriesNotDisabled validates that at least one query in the composite query is enabled
func (r *QueryRangeRequest) validateAllQueriesNotDisabled() error {
	allDisabled := true
	for _, envelope := range r.CompositeQuery.Queries {
		switch envelope.Type {
		case QueryTypeBuilder, QueryTypeSubQuery:
			switch spec := envelope.Spec.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				if !spec.Disabled {
					allDisabled = false
				}
			case QueryBuilderQuery[LogAggregation]:
				if !spec.Disabled {
					allDisabled = false
				}
			case QueryBuilderQuery[MetricAggregation]:
				if !spec.Disabled {
					allDisabled = false
				}
			}
		case QueryTypeFormula:
			if spec, ok := envelope.Spec.(QueryBuilderFormula); ok && !spec.Disabled {
				allDisabled = false
			}
		case QueryTypeTraceOperator:
			if spec, ok := envelope.Spec.(QueryBuilderTraceOperator); ok && !spec.Disabled {
				allDisabled = false
			}
		case QueryTypeJoin:
			if spec, ok := envelope.Spec.(QueryBuilderJoin); ok && !spec.Disabled {
				allDisabled = false
			}
		case QueryTypePromQL:
			if spec, ok := envelope.Spec.(PromQuery); ok && !spec.Disabled {
				allDisabled = false
			}
		case QueryTypeClickHouseSQL:
			if spec, ok := envelope.Spec.(ClickHouseQuery); ok && !spec.Disabled {
				allDisabled = false
			}
		}

		// Early exit if we find at least one enabled query
		if !allDisabled {
			break
		}
	}

	if allDisabled {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"all queries are disabled - at least one query must be enabled",
		)
	}

	return nil
}

func (r *QueryRangeRequest) validateCompositeQuery() error {
	// Validate queries in composite query
	if len(r.CompositeQuery.Queries) == 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"at least one query is required",
		)
	}

	// Track query names for uniqueness (only for non-formula queries)
	queryNames := make(map[string]bool)

	// Validate each query based on its type
	for i, envelope := range r.CompositeQuery.Queries {
		switch envelope.Type {
		case QueryTypeBuilder, QueryTypeSubQuery:
			// Validate based on the concrete type
			switch spec := envelope.Spec.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				if err := spec.Validate(r.RequestType); err != nil {
					queryId := getQueryIdentifier(envelope, i)
					return wrapValidationError(err, queryId, "invalid %s: %s")
				}
				// Check name uniqueness for non-formula context
				if spec.Name != "" {
					if queryNames[spec.Name] {
						return errors.NewInvalidInputf(
							errors.CodeInvalidInput,
							"duplicate query name '%s'",
							spec.Name,
						)
					}
					queryNames[spec.Name] = true
				}
			case QueryBuilderQuery[LogAggregation]:
				if err := spec.Validate(r.RequestType); err != nil {
					queryId := getQueryIdentifier(envelope, i)
					return wrapValidationError(err, queryId, "invalid %s: %s")
				}
				// Check name uniqueness for non-formula context
				if spec.Name != "" {
					if queryNames[spec.Name] {
						return errors.NewInvalidInputf(
							errors.CodeInvalidInput,
							"duplicate query name '%s'",
							spec.Name,
						)
					}
					queryNames[spec.Name] = true
				}
			case QueryBuilderQuery[MetricAggregation]:
				if err := spec.Validate(r.RequestType); err != nil {
					queryId := getQueryIdentifier(envelope, i)
					return wrapValidationError(err, queryId, "invalid %s: %s")
				}
				// Check name uniqueness for non-formula context
				if spec.Name != "" {
					if queryNames[spec.Name] {
						return errors.NewInvalidInputf(
							errors.CodeInvalidInput,
							"duplicate query name '%s'",
							spec.Name,
						)
					}
					queryNames[spec.Name] = true
				}
			default:
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown spec type for %s",
					queryId,
				)
			}
		case QueryTypeFormula:
			// Formula validation is handled separately
			spec, ok := envelope.Spec.(QueryBuilderFormula)
			if !ok {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Expression == "" {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"expression is required for %s",
					queryId,
				)
			}
		case QueryTypeJoin:
			// Join validation is handled separately
			_, ok := envelope.Spec.(QueryBuilderJoin)
			if !ok {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
		case QueryTypeTraceOperator:
			spec, ok := envelope.Spec.(QueryBuilderTraceOperator)
			if !ok {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Expression == "" {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"expression is required for %s",
					queryId,
				)
			}
		case QueryTypePromQL:
			// PromQL validation is handled separately
			spec, ok := envelope.Spec.(PromQuery)
			if !ok {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Query == "" {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"query expression is required for %s",
					queryId,
				)
			}
		case QueryTypeClickHouseSQL:
			// ClickHouse SQL validation is handled separately
			spec, ok := envelope.Spec.(ClickHouseQuery)
			if !ok {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Query == "" {
				queryId := getQueryIdentifier(envelope, i)
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"query expression is required for %s",
					queryId,
				)
			}
		default:
			queryId := getQueryIdentifier(envelope, i)
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown query type '%s' for %s",
				envelope.Type,
				queryId,
			).WithAdditional(
				"Valid query types are: builder_query, builder_formula, builder_join, promql, clickhouse_sql, trace_operator",
			)
		}
	}

	return nil
}

// Validate performs validation on CompositeQuery
func (c *CompositeQuery) Validate(requestType RequestType) error {
	if len(c.Queries) == 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"at least one query is required",
		)
	}

	// Validate each query
	for i, envelope := range c.Queries {
		if err := validateQueryEnvelope(envelope, requestType); err != nil {
			queryId := getQueryIdentifier(envelope, i)
			return wrapValidationError(err, queryId, "invalid %s: %s")
		}
	}

	return nil
}

func validateQueryEnvelope(envelope QueryEnvelope, requestType RequestType) error {
	switch envelope.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		switch spec := envelope.Spec.(type) {
		case QueryBuilderQuery[TraceAggregation]:
			return spec.Validate(requestType)
		case QueryBuilderQuery[LogAggregation]:
			return spec.Validate(requestType)
		case QueryBuilderQuery[MetricAggregation]:
			return spec.Validate(requestType)
		default:
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown query spec type",
			)
		}
	case QueryTypeFormula:
		spec, ok := envelope.Spec.(QueryBuilderFormula)
		if !ok {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid formula spec",
			)
		}
		if spec.Expression == "" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"formula expression is required",
			)
		}
		return nil
	case QueryTypeJoin:
		_, ok := envelope.Spec.(QueryBuilderJoin)
		if !ok {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid join spec",
			)
		}
		return nil
	case QueryTypeTraceOperator:
		spec, ok := envelope.Spec.(QueryBuilderTraceOperator)
		if !ok {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid trace operator spec",
			)
		}
		if spec.Expression == "" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"trace operator expression is required",
			)
		}
		return nil
	case QueryTypePromQL:
		spec, ok := envelope.Spec.(PromQuery)
		if !ok {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid PromQL spec",
			)
		}
		if spec.Query == "" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"PromQL query is required",
			)
		}
		return nil
	case QueryTypeClickHouseSQL:
		spec, ok := envelope.Spec.(ClickHouseQuery)
		if !ok {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid ClickHouse SQL spec",
			)
		}
		if spec.Query == "" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"ClickHouse SQL query is required",
			)
		}
		return nil
	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"unknown query type: %s",
			envelope.Type,
		).WithAdditional(
			"Valid query types are: builder_query, builder_sub_query, builder_formula, builder_join, promql, clickhouse_sql, trace_operator",
		)
	}
}

// validateMetricAggregation validates metric-specific aggregation parameters
func validateMetricAggregation(agg MetricAggregation) error {
	// we can't decide anything here without known temporality
	if agg.Temporality == metrictypes.Unknown {
		return nil
	}

	// Validate that rate/increase are only used with appropriate temporalities
	if agg.TimeAggregation == metrictypes.TimeAggregationRate || agg.TimeAggregation == metrictypes.TimeAggregationIncrease {
		// For gauge metrics (Unspecified temporality), rate/increase doesn't make sense
		if agg.Temporality == metrictypes.Unspecified {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"rate/increase aggregation cannot be used with gauge metrics (unspecified temporality)",
			)
		}
	}

	// Validate percentile aggregations are only used with histogram types
	if agg.SpaceAggregation.IsPercentile() {
		if agg.Type != metrictypes.HistogramType && agg.Type != metrictypes.ExpHistogramType && agg.Type != metrictypes.SummaryType {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"percentile aggregation can only be used with histogram or summary metric types",
			)
		}
	}

	// Validate time aggregation values
	validTimeAggregations := []metrictypes.TimeAggregation{
		metrictypes.TimeAggregationUnspecified,
		metrictypes.TimeAggregationLatest,
		metrictypes.TimeAggregationSum,
		metrictypes.TimeAggregationAvg,
		metrictypes.TimeAggregationMin,
		metrictypes.TimeAggregationMax,
		metrictypes.TimeAggregationCount,
		metrictypes.TimeAggregationCountDistinct,
		metrictypes.TimeAggregationRate,
		metrictypes.TimeAggregationIncrease,
	}

	validTimeAgg := slices.Contains(validTimeAggregations, agg.TimeAggregation)
	if !validTimeAgg {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time aggregation: %s",
			agg.TimeAggregation.StringValue(),
		).WithAdditional(
			"Valid time aggregations: latest, sum, avg, min, max, count, count_distinct, rate, increase",
		)
	}

	// Validate space aggregation values
	validSpaceAggregations := []metrictypes.SpaceAggregation{
		metrictypes.SpaceAggregationUnspecified,
		metrictypes.SpaceAggregationSum,
		metrictypes.SpaceAggregationAvg,
		metrictypes.SpaceAggregationMin,
		metrictypes.SpaceAggregationMax,
		metrictypes.SpaceAggregationCount,
		metrictypes.SpaceAggregationPercentile50,
		metrictypes.SpaceAggregationPercentile75,
		metrictypes.SpaceAggregationPercentile90,
		metrictypes.SpaceAggregationPercentile95,
		metrictypes.SpaceAggregationPercentile99,
	}

	validSpaceAgg := slices.Contains(validSpaceAggregations, agg.SpaceAggregation)
	if !validSpaceAgg {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid space aggregation: %s",
			agg.SpaceAggregation.StringValue(),
		).WithAdditional(
			"Valid space aggregations: sum, avg, min, max, count, p50, p75, p90, p95, p99",
		)
	}

	return nil
}
