package querybuildertypesv5

import (
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// queryName returns the name from any query envelope spec type.
func (e QueryEnvelope) queryName() string {
	switch spec := e.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Name
	case QueryBuilderQuery[LogAggregation]:
		return spec.Name
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Name
	case QueryBuilderFormula:
		return spec.Name
	case QueryBuilderTraceOperator:
		return spec.Name
	case QueryBuilderJoin:
		return spec.Name
	case PromQuery:
		return spec.Name
	case ClickHouseQuery:
		return spec.Name
	}
	return ""
}

// isDisabled returns the disabled status from any query envelope spec type.
func (e QueryEnvelope) isDisabled() bool {
	switch spec := e.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Disabled
	case QueryBuilderQuery[LogAggregation]:
		return spec.Disabled
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Disabled
	case QueryBuilderFormula:
		return spec.Disabled
	case QueryBuilderTraceOperator:
		return spec.Disabled
	case QueryBuilderJoin:
		return spec.Disabled
	case PromQuery:
		return spec.Disabled
	case ClickHouseQuery:
		return spec.Disabled
	}
	return false
}

// getQueryIdentifier returns a friendly identifier for a query based on its type and name/content
func getQueryIdentifier(envelope QueryEnvelope, index int) string {
	name := envelope.queryName()

	var typeLabel string
	switch envelope.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		typeLabel = "query"
	case QueryTypeFormula:
		typeLabel = "formula"
	case QueryTypeTraceOperator:
		typeLabel = "trace operator"
	case QueryTypeJoin:
		typeLabel = "join"
	case QueryTypePromQL:
		typeLabel = "PromQL query"
	case QueryTypeClickHouseSQL:
		typeLabel = "ClickHouse query"
	default:
		typeLabel = "query"
	}

	if name != "" {
		return fmt.Sprintf("%s '%s'", typeLabel, name)
	}
	return fmt.Sprintf("%s at position %d", typeLabel, index+1)
}

const (
	// Maximum limit for query results
	MaxQueryLimit = 10000
)

// Validate performs preliminary validation on QueryBuilderQuery
func (q *QueryBuilderQuery[T]) Validate(requestType RequestType) error {
	// Validate signal
	if err := q.validateSignal(); err != nil {
		return err
	}

	if err := q.validateAggregations(requestType); err != nil {
		return err
	}

	if err := q.validateGroupBy(requestType); err != nil {
		return err
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

	if err := q.validateOrderBy(requestType); err != nil {
		return err
	}

	if err := q.validateSelectFields(requestType); err != nil {
		return err
	}

	return nil
}

func (q *QueryBuilderQuery[T]) validateSelectFields(requestType RequestType) error {
	// selectFields don't apply to aggregation queries, skip validation
	if requestType.IsAggregation() {
		return nil
	}

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

func (q *QueryBuilderQuery[T]) validateGroupBy(requestType RequestType) error {
	// groupBy doesn't apply to non-aggregation queries, skip validation
	if !requestType.IsAggregation() {
		return nil
	}
	for idx, item := range q.GroupBy {
		if item.TelemetryFieldKey.Name == "" {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput, "invalid empty key name for group by at index %d", idx,
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

func (q *QueryBuilderQuery[T]) validateAggregations(requestType RequestType) error {
	// aggregations don't apply to non-aggregation queries, skip validation
	if !requestType.IsAggregation() {
		return nil
	}

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
		if err := fn.Validate(); err != nil {
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

func (q *QueryBuilderQuery[T]) validateOrderBy(requestType RequestType) error {
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

	// aggregation-specific order key validation only applies to aggregation queries
	if requestType.IsAggregation() {
		return q.validateOrderByForAggregation()
	}

	return nil
}

// validateOrderByForAggregation validates order by clauses for aggregation queries
// For aggregation queries, order by can only reference:
// 1. Group by keys
// 2. Aggregation expressions or aliases
// 3. Aggregation index (0, 1, 2, etc.)
func (q *QueryBuilderQuery[T]) validateOrderByForAggregation() error {

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

		// Also check the context-prefixed key name for alias matching
		// This handles cases where user specifies alias like "span.count_" and
		// order by comes as FieldContext=span, Name=count_
		contextPrefixedKey := fmt.Sprintf("%s.%s", order.Key.FieldContext.StringValue(), order.Key.Name)

		if !validOrderKeys[orderKey] && !validOrderKeys[contextPrefixedKey] {
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
	for _, envelope := range r.CompositeQuery.Queries {
		if !envelope.isDisabled() {
			return nil
		}
	}

	return errors.NewInvalidInputf(
		errors.CodeInvalidInput,
		"all queries are disabled - at least one query must be enabled",
	)
}

func (r *QueryRangeRequest) validateCompositeQuery() error {
	return r.CompositeQuery.Validate(r.RequestType)
}

// Validate performs validation on CompositeQuery
func (c *CompositeQuery) Validate(requestType RequestType) error {
	if len(c.Queries) == 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"at least one query is required",
		)
	}

	// Track query names for uniqueness (only for builder queries)
	queryNames := make(map[string]bool)

	for i, envelope := range c.Queries {
		if err := validateQueryEnvelope(envelope, requestType); err != nil {
			queryId := getQueryIdentifier(envelope, i)
			return wrapValidationError(err, queryId, "invalid %s: %s")
		}

		// Check name uniqueness for builder queries
		if envelope.Type == QueryTypeBuilder || envelope.Type == QueryTypeSubQuery {
			name := envelope.queryName()
			if name != "" {
				if queryNames[name] {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"duplicate query name '%s'",
						name,
					)
				}
				queryNames[name] = true
			}
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
