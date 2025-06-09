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

// TraceOrderByField defines the allowed fields for trace operator ordering
type TraceOrderByField struct{ valuer.String }

var (
	TraceOrderBySpanCount     = TraceOrderByField{valuer.NewString("span_count")}
	TraceOrderByTraceDuration = TraceOrderByField{valuer.NewString("trace_duration")}
)

// TraceOrderBy represents ordering for trace operators
type TraceOrderBy struct {
	Field     TraceOrderByField `json:"field"`
	Direction OrderDirection    `json:"direction"`
}

// QueryBuilderTraceOperator represents a trace operator query (AIP-158 and AIP-160 compliant)
type QueryBuilderTraceOperator struct {
	Name     string `json:"name"`
	Disabled bool   `json:"disabled,omitempty"`

	// The expression string that will be parsed server-side
	Expression string `json:"expression"`

	// AIP-160 compliant filter for trace-level conditions
	Filter *Filter `json:"filter,omitempty"`

	// Trace-specific ordering (only span_count and trace_duration allowed)
	OrderBy *TraceOrderBy `json:"orderBy,omitempty"`

	// AIP-158 compliant pagination
	Limit     int    `json:"limit,omitempty"`
	PageToken string `json:"page_token,omitempty"`

	// Other post-processing options
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`
	Functions    []Function                         `json:"functions,omitempty"`

	// Internal parsed representation (not exposed in JSON)
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

	// Validate orderBy field if present
	if err := q.ValidateOrderBy(); err != nil {
		return err
	}

	// Validate pagination parameters
	if err := q.ValidatePagination(); err != nil {
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

// ValidateOrderBy validates the orderBy field
func (q *QueryBuilderTraceOperator) ValidateOrderBy() error {
	if q.OrderBy == nil {
		return nil
	}

	// Validate field is one of the allowed values
	if q.OrderBy.Field != TraceOrderBySpanCount && q.OrderBy.Field != TraceOrderByTraceDuration {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"orderBy field must be either 'span_count' or 'trace_duration', got '%s'",
			q.OrderBy.Field,
		)
	}

	// Validate direction
	if q.OrderBy.Direction != OrderDirectionAsc && q.OrderBy.Direction != OrderDirectionDesc {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"orderBy direction must be either 'asc' or 'desc', got '%s'",
			q.OrderBy.Direction,
		)
	}

	return nil
}

// ValidatePagination validates pagination parameters (AIP-158 compliance)
func (q *QueryBuilderTraceOperator) ValidatePagination() error {
	if q.Limit < 0 {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"limit must be non-negative, got %d",
			q.Limit,
		)
	}

	// For production use, you might want to enforce maximum limits
	if q.Limit > 10000 {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"limit cannot exceed 10000, got %d",
			q.Limit,
		)
	}

	return nil
}

// ValidateUniqueTraceOperator ensures only one trace operator exists in queries
func ValidateUniqueTraceOperator(queries []QueryEnvelope) error {
	traceOperatorCount := 0
	var traceOperatorNames []string

	for _, query := range queries {
		if query.Type == QueryTypeTraceOperator {
			traceOperatorCount++
			traceOperatorNames = append(traceOperatorNames, query.Name)
		}
	}

	if traceOperatorCount > 1 {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"only one trace operator is allowed per request, found %d trace operators: %v",
			traceOperatorCount,
			traceOperatorNames,
		)
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
	opLen := len(op)

	// Scan from right to left to find the rightmost operator at depth 0
	for i := len(expr) - 1; i >= 0; i-- {
		char := expr[i]

		// Update depth based on parentheses (scanning right to left)
		if char == ')' {
			depth++
		} else if char == '(' {
			depth--
		}

		// Only check for operators when we're at depth 0 (outside parentheses)
		// and make sure we have enough characters for the operator
		if depth == 0 && i+opLen <= len(expr) {
			// Check if the substring matches our operator
			if expr[i:i+opLen] == op {
				// For " NOT " (binary), ensure proper spacing
				if op == " NOT " {
					// Make sure it's properly space-padded
					if i > 0 && i+opLen < len(expr) {
						return i
					}
				} else {
					// For other operators (=>, &&, ||), return immediately
					return i
				}
			}
		}
	}
	return -1
}
