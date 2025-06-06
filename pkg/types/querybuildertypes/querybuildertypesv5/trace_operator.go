package querybuildertypesv5

import (
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// TraceOperatorType defines the type of trace operator
type TraceOperatorType struct{ valuer.String }

var (
	TraceOperatorDirectDescendant   = TraceOperatorType{valuer.NewString("=>")}
	TraceOperatorIndirectDescendant = TraceOperatorType{valuer.NewString("->")}
	TraceOperatorAnd                = TraceOperatorType{valuer.NewString("&&")}
	TraceOperatorOr                 = TraceOperatorType{valuer.NewString("||")}
	TraceOperatorNot                = TraceOperatorType{valuer.NewString("NOT")}
	TraceOperatorExclude            = TraceOperatorType{valuer.NewString("NOT")}
)

// TraceFilterCondition represents a condition for trace-level filtering
type TraceFilterCondition struct {
	Operator FilterOperator `json:"operator"`
	Value    string         `json:"value,omitempty"`
	Values   []string       `json:"values,omitempty"`
}

// TraceFilters represents trace-level conditions
type TraceFilters struct {
	SpanCount     *TraceFilterCondition `json:"span_count,omitempty"`
	TraceDuration *TraceFilterCondition `json:"trace_duration,omitempty"`
}

// QueryBuilderTraceOperator represents a trace operator query
type QueryBuilderTraceOperator struct {
	Name     string `json:"name"`
	Disabled bool   `json:"disabled,omitempty"`

	Expression string `json:"expression"`

	TraceFilters *TraceFilters `json:"traceFilters,omitempty"`

	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`
	Order        []OrderBy                          `json:"order,omitempty"`
	Limit        int                                `json:"limit,omitempty"`

	ParsedExpression *TraceOperand `json:"-"`
}

// TraceOperand represents the internal parsed tree structure
type TraceOperand struct {
	// For leaf nodes - reference to a query
	QueryRef *QueryRef `json:"-"`

	// For nested operations
	Operator *TraceOperatorType `json:"-"`
	Left     *TraceOperand      `json:"-"`
	Right    *TraceOperand      `json:"-"`
}

// ParseExpression parses the expression string into a tree structure
func (q *QueryBuilderTraceOperator) ParseExpression() error {
	if q.Expression == "" {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"expression cannot be empty",
		)
	}

	parsed, err := parseTraceExpression(q.Expression)
	if err != nil {
		return errors.WrapInvalidInputf(
			err,
			errors.CodeInvalidInput,
			"failed to parse expression '%s'",
			q.Expression,
		)
	}

	q.ParsedExpression = parsed
	return nil
}

// ValidateTraceOperator validates that all referenced queries exist and are trace queries
func (q *QueryBuilderTraceOperator) ValidateTraceOperator(queries []QueryEnvelope) error {
	// Parse the expression
	if err := q.ParseExpression(); err != nil {
		return err
	}

	// Validate trace filters
	if err := q.ValidateTraceFilters(); err != nil {
		return err
	}

	// Create a map of query names to their signal types
	querySignals := make(map[string]telemetrytypes.Signal)
	for _, query := range queries {
		if query.Type == QueryTypeBuilder || query.Type == QueryTypeSubQuery {
			switch spec := query.Spec.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				querySignals[query.Name] = spec.Signal
			case QueryBuilderQuery[LogAggregation]:
				querySignals[query.Name] = spec.Signal
			case QueryBuilderQuery[MetricAggregation]:
				querySignals[query.Name] = spec.Signal
			}
		}
	}

	// Validate all operands in the parsed tree
	return q.validateOperand(q.ParsedExpression, querySignals)
}

// ValidateTraceFilters validates all trace filter conditions
func (q *QueryBuilderTraceOperator) ValidateTraceFilters() error {
	if q.TraceFilters == nil {
		return nil
	}

	if q.TraceFilters.TraceDuration != nil {
		if err := validateTraceFilterCondition(q.TraceFilters.TraceDuration, "trace_duration"); err != nil {
			return err
		}
	}

	if q.TraceFilters.SpanCount != nil {
		if err := validateTraceFilterCondition(q.TraceFilters.SpanCount, "span_count"); err != nil {
			return err
		}
	}

	return nil
}

// validateOperand recursively validates operands
func (q *QueryBuilderTraceOperator) validateOperand(operand *TraceOperand, querySignals map[string]telemetrytypes.Signal) error {
	if operand == nil {
		return nil
	}

	if operand.QueryRef != nil {
		// Validate query reference
		signal, exists := querySignals[operand.QueryRef.Name]
		if !exists {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"referenced query '%s' does not exist",
				operand.QueryRef.Name,
			)
		}

		if signal != telemetrytypes.SignalTraces {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"referenced query '%s' must be a trace query, but found signal '%s'",
				operand.QueryRef.Name,
				signal,
			)
		}
	}

	// Validate children
	if err := q.validateOperand(operand.Left, querySignals); err != nil {
		return err
	}
	if err := q.validateOperand(operand.Right, querySignals); err != nil {
		return err
	}

	return nil
}

// validateTraceFilterCondition validates a trace filter condition
func validateTraceFilterCondition(condition *TraceFilterCondition, fieldName string) error {
	if condition == nil {
		return nil
	}

	switch condition.Operator {
	case FilterOperatorEqual, FilterOperatorNotEqual,
		FilterOperatorGreaterThan, FilterOperatorGreaterThanOrEq,
		FilterOperatorLessThan, FilterOperatorLessThanOrEq:
		if condition.Value == "" {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"%s filter requires a non-empty value",
				fieldName,
			)
		}
		if len(condition.Values) > 0 {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"%s filter should use 'value' field for single-value operators",
				fieldName,
			)
		}

	case FilterOperatorBetween, FilterOperatorNotBetween:
		if len(condition.Values) != 2 {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"%s filter with 'between' operator requires exactly 2 values, got %d",
				fieldName,
				len(condition.Values),
			)
		}
		for i, value := range condition.Values {
			if value == "" {
				return errors.WrapInvalidInputf(
					nil,
					errors.CodeInvalidInput,
					"%s filter: value %d cannot be empty",
					fieldName,
					i+1,
				)
			}
		}

	case FilterOperatorIn, FilterOperatorNotIn:
		if len(condition.Values) == 0 {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"%s filter with 'in' operator requires at least 1 value",
				fieldName,
			)
		}
		for i, value := range condition.Values {
			if value == "" {
				return errors.WrapInvalidInputf(
					nil,
					errors.CodeInvalidInput,
					"%s filter: value %d cannot be empty",
					fieldName,
					i+1,
				)
			}
		}

	default:
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"unsupported operator for %s filter",
			fieldName,
		)
	}

	return nil
}

// parseTraceExpression parses an expression string into a tree structure
// Handles precedence: NOT (highest) > || > && > => (lowest)
func parseTraceExpression(expr string) (*TraceOperand, error) {
	expr = strings.TrimSpace(expr)

	// Handle parentheses
	if strings.HasPrefix(expr, "(") && strings.HasSuffix(expr, ")") {
		return parseTraceExpression(expr[1 : len(expr)-1])
	}

	// Handle unary NOT operator (prefix)
	if strings.HasPrefix(expr, "NOT ") {
		operand, err := parseTraceExpression(expr[4:])
		if err != nil {
			return nil, err
		}
		notOp := TraceOperatorNot
		return &TraceOperand{
			Operator: &notOp,
			Left:     operand,
		}, nil
	}

	// Find binary operators with lowest precedence first
	operators := []string{"=>", "&&", "||", " NOT "}

	for _, op := range operators {
		if pos := findOperatorPosition(expr, op); pos != -1 {
			leftExpr := strings.TrimSpace(expr[:pos])
			rightExpr := strings.TrimSpace(expr[pos+len(op):])

			left, err := parseTraceExpression(leftExpr)
			if err != nil {
				return nil, err
			}

			right, err := parseTraceExpression(rightExpr)
			if err != nil {
				return nil, err
			}

			var opType TraceOperatorType
			switch strings.TrimSpace(op) {
			case "=>":
				opType = TraceOperatorDirectDescendant
			case "->":
				opType = TraceOperatorIndirectDescendant
			case "&&":
				opType = TraceOperatorAnd
			case "||":
				opType = TraceOperatorOr
			case "NOT":
				opType = TraceOperatorExclude // Binary NOT (A NOT B)
			}

			return &TraceOperand{
				Operator: &opType,
				Left:     left,
				Right:    right,
			}, nil
		}
	}

	// If no operators found, this should be a query reference
	if matched, _ := regexp.MatchString(`^[A-Za-z][A-Za-z0-9_]*$`, expr); !matched {
		return nil, errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"invalid query reference '%s'",
			expr,
		)
	}

	return &TraceOperand{
		QueryRef: &QueryRef{Name: expr},
	}, nil
}

// findOperatorPosition finds the position of an operator, respecting parentheses
func findOperatorPosition(expr, op string) int {
	depth := 0
	for i := len(expr) - len(op); i >= 0; i-- {
		if expr[i] == ')' {
			depth++
		} else if expr[i] == '(' {
			depth--
		} else if depth == 0 && strings.HasPrefix(expr[i:], op) {
			// Check it's not part of another operator
			if i > 0 && expr[i-1] == '=' && op == ">" {
				continue
			}
			if i+len(op) < len(expr) && expr[i+len(op)] == '=' && op != "=>" {
				continue
			}
			return i
		}
	}
	return -1
}
