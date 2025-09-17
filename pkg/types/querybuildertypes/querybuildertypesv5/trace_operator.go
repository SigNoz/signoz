package querybuildertypesv5

import (
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type TraceOperatorType struct{ valuer.String }

var (
	TraceOperatorDirectDescendant   = TraceOperatorType{valuer.NewString("=>")}
	TraceOperatorIndirectDescendant = TraceOperatorType{valuer.NewString("->")}
	TraceOperatorAnd                = TraceOperatorType{valuer.NewString("&&")}
	TraceOperatorOr                 = TraceOperatorType{valuer.NewString("||")}
	TraceOperatorNot                = TraceOperatorType{valuer.NewString("NOT")}
	TraceOperatorExclude            = TraceOperatorType{valuer.NewString("NOT")}
)

type TraceOrderBy struct {
	valuer.String
}

var (
	OrderBySpanCount     = TraceOrderBy{valuer.NewString("span_count")}
	OrderByTraceDuration = TraceOrderBy{valuer.NewString("trace_duration")}
)

const (
	// MaxTraceOperators defines the maximum number of operators allowed in a trace expression
	MaxTraceOperators = 10
)

type QueryBuilderTraceOperator struct {
	Name     string `json:"name"`
	Disabled bool   `json:"disabled,omitempty"`

	Expression string `json:"expression"`

	Filter *Filter `json:"filter,omitempty"`

	// User-configurable span return strategy - which query's spans to return
	ReturnSpansFrom string `json:"returnSpansFrom,omitempty"`

	// Trace-specific ordering (only span_count and trace_duration allowed)
	Order []OrderBy `json:"order,omitempty"`

	Aggregations []TraceAggregation `json:"aggregations,omitempty"`
	StepInterval Step               `json:"stepInterval,omitempty"`
	GroupBy      []GroupByKey       `json:"groupBy,omitempty"`

	// having clause to apply to the aggregated query results
	Having *Having `json:"having,omitempty"`

	Limit  int    `json:"limit,omitempty"`
	Offset int    `json:"offset,omitempty"`
	Cursor string `json:"cursor,omitempty"`

	Legend string `json:"legend,omitempty"`

	// Other post-processing options
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`
	Functions    []Function                         `json:"functions,omitempty"`

	// Internal parsed representation (not exposed in JSON)
	ParsedExpression *TraceOperand `json:"-"`
}

// TraceOperand represents the internal parsed tree structure
type TraceOperand struct {
	// For leaf nodes - reference to a query
	QueryRef *TraceOperatorQueryRef `json:"-"`

	// For nested operations
	Operator *TraceOperatorType `json:"-"`
	Left     *TraceOperand      `json:"-"`
	Right    *TraceOperand      `json:"-"`
}

// TraceOperatorQueryRef represents a reference to another query
type TraceOperatorQueryRef struct {
	Name string `json:"name"`
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

	parsed, operatorCount, err := parseTraceExpression(q.Expression)
	if err != nil {
		return errors.WrapInvalidInputf(
			err,
			errors.CodeInvalidInput,
			"failed to parse expression '%s'",
			q.Expression,
		)
	}

	// Validate operator count immediately during parsing
	if operatorCount > MaxTraceOperators {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"expression contains %d operators, which exceeds the maximum allowed %d operators",
			operatorCount,
			MaxTraceOperators,
		)
	}

	q.ParsedExpression = parsed
	return nil
}

// ValidateTraceOperator validates that all referenced queries exist and are trace queries
func (q *QueryBuilderTraceOperator) ValidateTraceOperator(queries []QueryEnvelope) error {
	// Parse the expression - this now includes operator count validation
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

	// Create a map of query names to track if they exist and their signal type
	availableQueries := make(map[string]telemetrytypes.Signal)

	// Only collect trace queries
	for _, query := range queries {
		if query.Type == QueryTypeBuilder {
			switch spec := query.Spec.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				if spec.Signal == telemetrytypes.SignalTraces {
					availableQueries[spec.Name] = spec.Signal
				}
			}
		}
	}

	// Get all query names referenced in the expression
	referencedQueries := q.CollectReferencedQueries(q.ParsedExpression)

	// Validate that all referenced queries exist and are trace queries
	for _, queryName := range referencedQueries {
		signal, exists := availableQueries[queryName]
		if !exists {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"query '%s' referenced in trace operator expression does not exist or is not a trace query",
				queryName,
			)
		}

		// This check is redundant since we only add trace queries to availableQueries, but keeping for clarity
		if signal != telemetrytypes.SignalTraces {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"query '%s' must be a trace query, but found signal '%s'",
				queryName,
				signal,
			)
		}
	}

	if q.StepInterval.Seconds() < 0 {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"stepInterval cannot be negative, got %f seconds",
			q.StepInterval.Seconds(),
		)
	}

	// Validate ReturnSpansFrom if specified
	if q.ReturnSpansFrom != "" {
		if _, exists := availableQueries[q.ReturnSpansFrom]; !exists {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"returnSpansFrom references query '%s' which does not exist or is not a trace query",
				q.ReturnSpansFrom,
			)
		}

		// Ensure the query is referenced in the expression
		found := false
		for _, queryName := range referencedQueries {
			if queryName == q.ReturnSpansFrom {
				found = true
				break
			}
		}

		if !found {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"returnSpansFrom references query '%s' which is not used in the expression '%s'",
				q.ReturnSpansFrom,
				q.Expression,
			)
		}
	}

	return nil
}

// ValidateOrderBy validates the orderBy field
func (q *QueryBuilderTraceOperator) ValidateOrderBy() error {
	if len(q.Order) == 0 {
		return nil
	}

	for i, orderBy := range q.Order {
		// Validate field is one of the allowed values
		fieldName := orderBy.Key.Name
		if fieldName != OrderBySpanCount.StringValue() && fieldName != OrderByTraceDuration.StringValue() {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"orderBy[%d] field must be either '%s' or '%s', got '%s'",
				i, OrderBySpanCount.StringValue(), OrderByTraceDuration.StringValue(), fieldName,
			)
		}

		// Validate direction
		if orderBy.Direction != OrderDirectionAsc && orderBy.Direction != OrderDirectionDesc {
			return errors.WrapInvalidInputf(
				nil,
				errors.CodeInvalidInput,
				"orderBy[%d] direction must be either 'asc' or 'desc', got '%s'",
				i, orderBy.Direction,
			)
		}
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

	if q.Offset < 0 {
		return errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"offset must be non-negative, got %d",
			q.Offset,
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

// CollectReferencedQueries collects all query names referenced in the expression tree
func (q *QueryBuilderTraceOperator) CollectReferencedQueries(operand *TraceOperand) []string {
	if operand == nil {
		return nil
	}

	var queries []string

	if operand.QueryRef != nil {
		queries = append(queries, operand.QueryRef.Name)
	}

	// Recursively collect from children
	queries = append(queries, q.CollectReferencedQueries(operand.Left)...)
	queries = append(queries, q.CollectReferencedQueries(operand.Right)...)

	// Remove duplicates
	seen := make(map[string]bool)
	unique := []string{}
	for _, q := range queries {
		if !seen[q] {
			seen[q] = true
			unique = append(unique, q)
		}
	}

	return unique
}

// Copy creates a deep copy of QueryBuilderTraceOperator
func (q QueryBuilderTraceOperator) Copy() QueryBuilderTraceOperator {
	// Start with a shallow copy
	c := q

	if q.Filter != nil {
		c.Filter = q.Filter.Copy()
	}

	if q.Order != nil {
		c.Order = make([]OrderBy, len(q.Order))
		for i, o := range q.Order {
			c.Order[i] = o.Copy()
		}
	}

	if q.Aggregations != nil {
		c.Aggregations = make([]TraceAggregation, len(q.Aggregations))
		copy(c.Aggregations, q.Aggregations)
	}

	if q.GroupBy != nil {
		c.GroupBy = make([]GroupByKey, len(q.GroupBy))
		for i, gb := range q.GroupBy {
			c.GroupBy[i] = gb.Copy()
		}
	}

	if q.Having != nil {
		c.Having = q.Having.Copy()
	}

	if q.SelectFields != nil {
		c.SelectFields = make([]telemetrytypes.TelemetryFieldKey, len(q.SelectFields))
		copy(c.SelectFields, q.SelectFields)
	}

	if q.Functions != nil {
		c.Functions = make([]Function, len(q.Functions))
		for i, f := range q.Functions {
			c.Functions[i] = f.Copy()
		}
	}

	// Note: ParsedExpression is not copied as it's internal and will be re-parsed when needed
	c.ParsedExpression = nil

	return c
}

// ValidateUniqueTraceOperator ensures only one trace operator exists in queries
func ValidateUniqueTraceOperator(queries []QueryEnvelope) error {
	traceOperatorCount := 0
	var traceOperatorNames []string

	for _, query := range queries {
		if query.Type == QueryTypeTraceOperator {
			// Extract the name from the trace operator spec
			if spec, ok := query.Spec.(QueryBuilderTraceOperator); ok {
				traceOperatorCount++
				traceOperatorNames = append(traceOperatorNames, spec.Name)
			}
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

// Handles precedence: NOT (highest) > || > && > => (lowest)
func parseTraceExpression(expr string) (*TraceOperand, int, error) {
	expr = strings.TrimSpace(expr)

	// Handle parentheses
	if strings.HasPrefix(expr, "(") && strings.HasSuffix(expr, ")") {
		// Check if parentheses are balanced
		if isBalancedParentheses(expr[1 : len(expr)-1]) {
			return parseTraceExpression(expr[1 : len(expr)-1])
		}
	}

	// Handle unary NOT operator (prefix)
	if strings.HasPrefix(expr, "NOT ") {
		operand, count, err := parseTraceExpression(expr[4:])
		if err != nil {
			return nil, 0, err
		}
		notOp := TraceOperatorNot
		return &TraceOperand{
			Operator: &notOp,
			Left:     operand,
		}, count + 1, nil // Add 1 for this NOT operator
	}

	// Find binary operators with lowest precedence first (=> has lowest precedence)
	// Order: => (lowest) < && < || < NOT (highest)
	operators := []string{"->", "=>", "&&", "||", " NOT "}

	for _, op := range operators {
		if pos := findOperatorPosition(expr, op); pos != -1 {
			leftExpr := strings.TrimSpace(expr[:pos])
			rightExpr := strings.TrimSpace(expr[pos+len(op):])

			left, leftCount, err := parseTraceExpression(leftExpr)
			if err != nil {
				return nil, 0, err
			}

			right, rightCount, err := parseTraceExpression(rightExpr)
			if err != nil {
				return nil, 0, err
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
			}, leftCount + rightCount + 1, nil // Add counts from both sides + 1 for this operator
		}
	}

	// If no operators found, this should be a query reference
	if matched, _ := regexp.MatchString(`^[A-Za-z][A-Za-z0-9_]*$`, expr); !matched {
		return nil, 0, errors.WrapInvalidInputf(
			nil,
			errors.CodeInvalidInput,
			"invalid query reference '%s'",
			expr,
		)
	}

	// Leaf node - no operators
	return &TraceOperand{
		QueryRef: &TraceOperatorQueryRef{Name: expr},
	}, 0, nil
}

// isBalancedParentheses checks if parentheses are balanced in the expression
func isBalancedParentheses(expr string) bool {
	depth := 0
	for _, char := range expr {
		if char == '(' {
			depth++
		} else if char == ')' {
			depth--
			if depth < 0 {
				return false
			}
		}
	}
	return depth == 0
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
