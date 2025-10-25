package querybuilder

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/antlr4-go/antlr/v4"
)

// FieldConstraint represents a constraint on a field
type FieldConstraint struct {
	Field    string
	Operator qbtypes.FilterOperator
	Value    interface{}
	Values   []interface{} // For IN, NOT IN operations
}

// ConstraintSet represents a set of constraints that must all be true (AND)
type ConstraintSet struct {
	Constraints map[string][]FieldConstraint // field -> constraints
}

// LogicalContradictionDetector implements the visitor pattern to detect logical contradictions
type LogicalContradictionDetector struct {
	grammar.BaseFilterQueryVisitor
	constraintStack []*ConstraintSet // Stack of constraint sets for nested expressions
	contradictions  []string
	notContextStack []bool // Stack to track NOT contexts
}

// DetectContradictions analyzes a query string and returns any contradictions found
func DetectContradictions(query string) ([]string, error) {
	// Setup ANTLR parsing pipeline
	input := antlr.NewInputStream(query)
	lexer := grammar.NewFilterQueryLexer(input)

	// Error handling
	lexerErrorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)

	parserErrorListener := NewErrorListener()
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	// Parse the query
	tree := parser.Query()

	// Check for syntax errors
	if len(parserErrorListener.SyntaxErrors) > 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "syntax errors: %v", parserErrorListener.SyntaxErrors)
	}

	// Create detector and visit tree
	detector := &LogicalContradictionDetector{
		constraintStack: []*ConstraintSet{
			{Constraints: make(map[string][]FieldConstraint)},
		},
		contradictions:  []string{},
		notContextStack: []bool{false},
	}

	detector.Visit(tree)

	// Deduplicate contradictions
	seen := make(map[string]bool)
	unique := []string{}
	for _, c := range detector.contradictions {
		if !seen[c] {
			seen[c] = true
			unique = append(unique, c)
		}
	}

	return unique, nil
}

// Helper methods for constraint stack
func (d *LogicalContradictionDetector) currentConstraints() *ConstraintSet {
	return d.constraintStack[len(d.constraintStack)-1]
}

// Helper methods for NOT context
func (d *LogicalContradictionDetector) inNotContext() bool {
	return d.notContextStack[len(d.notContextStack)-1]
}

func (d *LogicalContradictionDetector) pushNotContext(value bool) {
	d.notContextStack = append(d.notContextStack, value)
}

func (d *LogicalContradictionDetector) popNotContext() {
	if len(d.notContextStack) > 1 {
		d.notContextStack = d.notContextStack[:len(d.notContextStack)-1]
	}
}

// Visit dispatches to the appropriate visit method
func (d *LogicalContradictionDetector) Visit(tree antlr.ParseTree) interface{} {
	if tree == nil {
		return nil
	}
	return tree.Accept(d)
}

// VisitQuery is the entry point
func (d *LogicalContradictionDetector) VisitQuery(ctx *grammar.QueryContext) interface{} {
	d.Visit(ctx.Expression())
	// Check final constraints
	d.checkContradictions(d.currentConstraints())
	return nil
}

// VisitExpression just passes through to OrExpression
func (d *LogicalContradictionDetector) VisitExpression(ctx *grammar.ExpressionContext) interface{} {
	return d.Visit(ctx.OrExpression())
}

// VisitOrExpression handles OR logic
func (d *LogicalContradictionDetector) VisitOrExpression(ctx *grammar.OrExpressionContext) interface{} {
	andExpressions := ctx.AllAndExpression()

	if len(andExpressions) == 1 {
		// Single AND expression, just visit it
		return d.Visit(andExpressions[0])
	}

	// Multiple AND expressions connected by OR
	// Visit each branch to find contradictions within branches
	for _, andExpr := range andExpressions {
		// Save current constraints
		savedConstraints := d.cloneConstraintSet(d.currentConstraints())

		// Visit the AND expression
		d.Visit(andExpr)

		// Restore constraints for next branch
		d.constraintStack[len(d.constraintStack)-1] = savedConstraints
	}

	return nil
}

// VisitAndExpression handles AND logic (including implicit AND)
func (d *LogicalContradictionDetector) VisitAndExpression(ctx *grammar.AndExpressionContext) interface{} {
	unaryExpressions := ctx.AllUnaryExpression()

	// Visit each unary expression, accumulating constraints
	for _, unaryExpr := range unaryExpressions {
		d.Visit(unaryExpr)
	}

	return nil
}

// VisitUnaryExpression handles NOT operator
func (d *LogicalContradictionDetector) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) interface{} {
	hasNot := ctx.NOT() != nil

	if hasNot {
		// Push new NOT context (toggle current value)
		d.pushNotContext(!d.inNotContext())
	}

	result := d.Visit(ctx.Primary())

	if hasNot {
		// Pop NOT context
		d.popNotContext()
	}

	return result
}

// VisitPrimary handles different primary expressions
func (d *LogicalContradictionDetector) VisitPrimary(ctx *grammar.PrimaryContext) interface{} {
	if ctx.OrExpression() != nil {
		// Parenthesized expression
		// If we're in an AND context, we continue with the same constraint set
		// Otherwise, we need to handle it specially
		return d.Visit(ctx.OrExpression())
	} else if ctx.Comparison() != nil {
		return d.Visit(ctx.Comparison())
	} else if ctx.FunctionCall() != nil {
		// Handle function calls if needed
		return nil
	} else if ctx.FullText() != nil {
		// Handle full text search if needed
		return nil
	}

	return nil
}

// VisitComparison extracts constraints from comparisons
func (d *LogicalContradictionDetector) VisitComparison(ctx *grammar.ComparisonContext) interface{} {
	if ctx.Key() == nil {
		return nil
	}

	field := ctx.Key().GetText()
	notContext := d.inNotContext()

	// Handle EXISTS
	if ctx.EXISTS() != nil {
		operator := qbtypes.FilterOperatorExists
		if ctx.NOT() != nil {
			operator = qbtypes.FilterOperatorNotExists
		}
		// Apply NOT context
		if notContext {
			operator = negateOperator(operator)
		}
		constraint := FieldConstraint{
			Field:    field,
			Operator: operator,
		}
		d.addConstraint(constraint)
		return nil
	}

	// Handle IN/NOT IN
	if ctx.InClause() != nil {
		values := d.extractValueList(ctx.InClause().(*grammar.InClauseContext).ValueList())
		operator := qbtypes.FilterOperatorIn
		if notContext {
			operator = negateOperator(operator)
		}
		constraint := FieldConstraint{
			Field:    field,
			Operator: operator,
			Values:   values,
		}
		d.addConstraint(constraint)
		return nil
	}

	if ctx.NotInClause() != nil {
		values := d.extractValueList(ctx.NotInClause().(*grammar.NotInClauseContext).ValueList())
		operator := qbtypes.FilterOperatorNotIn
		if notContext {
			operator = negateOperator(operator)
		}
		constraint := FieldConstraint{
			Field:    field,
			Operator: operator,
			Values:   values,
		}
		d.addConstraint(constraint)
		return nil
	}

	// Handle BETWEEN
	if ctx.BETWEEN() != nil {
		values := ctx.AllValue()
		if len(values) == 2 {
			val1 := d.extractValue(values[0])
			val2 := d.extractValue(values[1])
			operator := qbtypes.FilterOperatorBetween
			if ctx.NOT() != nil {
				operator = qbtypes.FilterOperatorNotBetween
			}
			// Apply NOT context
			if notContext {
				operator = negateOperator(operator)
			}
			constraint := FieldConstraint{
				Field:    field,
				Operator: operator,
				Values:   []interface{}{val1, val2},
			}
			d.addConstraint(constraint)
		}
		return nil
	}

	// Handle regular comparisons
	values := ctx.AllValue()
	if len(values) > 0 {
		value := d.extractValue(values[0])
		var operator qbtypes.FilterOperator

		if ctx.EQUALS() != nil {
			operator = qbtypes.FilterOperatorEqual
		} else if ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil {
			operator = qbtypes.FilterOperatorNotEqual
		} else if ctx.LT() != nil {
			operator = qbtypes.FilterOperatorLessThan
		} else if ctx.LE() != nil {
			operator = qbtypes.FilterOperatorLessThanOrEq
		} else if ctx.GT() != nil {
			operator = qbtypes.FilterOperatorGreaterThan
		} else if ctx.GE() != nil {
			operator = qbtypes.FilterOperatorGreaterThanOrEq
		} else if ctx.LIKE() != nil {
			operator = qbtypes.FilterOperatorLike
			if ctx.NOT() != nil {
				operator = qbtypes.FilterOperatorNotLike
			}
		} else if ctx.ILIKE() != nil {
			operator = qbtypes.FilterOperatorILike
			if ctx.NOT() != nil {
				operator = qbtypes.FilterOperatorNotILike
			}
		} else if ctx.REGEXP() != nil {
			operator = qbtypes.FilterOperatorRegexp
			if ctx.NOT() != nil {
				operator = qbtypes.FilterOperatorNotRegexp
			}
		} else if ctx.CONTAINS() != nil {
			operator = qbtypes.FilterOperatorContains
			if ctx.NOT() != nil {
				operator = qbtypes.FilterOperatorNotContains
			}
		}

		if operator != qbtypes.FilterOperatorUnknown {
			// Apply NOT context if needed
			if notContext {
				operator = negateOperator(operator)
			}

			constraint := FieldConstraint{
				Field:    field,
				Operator: operator,
				Value:    value,
			}
			d.addConstraint(constraint)
		}
	}

	// Check for contradictions after adding this constraint
	d.checkContradictions(d.currentConstraints())

	return nil
}

// extractValue extracts the actual value from a ValueContext
func (d *LogicalContradictionDetector) extractValue(ctx grammar.IValueContext) interface{} {
	if ctx.QUOTED_TEXT() != nil {
		text := ctx.QUOTED_TEXT().GetText()
		// Remove quotes
		if len(text) >= 2 {
			return text[1 : len(text)-1]
		}
		return text
	} else if ctx.NUMBER() != nil {
		return ctx.NUMBER().GetText()
	} else if ctx.BOOL() != nil {
		return ctx.BOOL().GetText()
	} else if ctx.KEY() != nil {
		return ctx.KEY().GetText()
	}
	return ""
}

// extractValueList extracts values from a ValueListContext
func (d *LogicalContradictionDetector) extractValueList(ctx grammar.IValueListContext) []interface{} {
	if ctx == nil {
		return nil
	}

	values := []interface{}{}
	for _, val := range ctx.AllValue() {
		values = append(values, d.extractValue(val))
	}
	return values
}

// addConstraint adds a constraint to the current set
func (d *LogicalContradictionDetector) addConstraint(constraint FieldConstraint) {
	constraints := d.currentConstraints()

	// For positive operators that imply existence, add an implicit EXISTS constraint
	// This mirrors the behavior of AddDefaultExistsFilter in the FilterOperator type
	if constraint.Operator.AddDefaultExistsFilter() && !isNegativeOperator(constraint.Operator) {
		// The field must exist for positive predicates
		// This helps detect contradictions like: field = "value" AND field NOT EXISTS
		existsConstraint := FieldConstraint{
			Field:    constraint.Field,
			Operator: qbtypes.FilterOperatorExists,
		}
		constraints.Constraints[constraint.Field] = append(
			constraints.Constraints[constraint.Field],
			existsConstraint,
		)
	}

	constraints.Constraints[constraint.Field] = append(
		constraints.Constraints[constraint.Field],
		constraint,
	)
}

// checkContradictions checks the given constraint set for contradictions
func (d *LogicalContradictionDetector) checkContradictions(constraintSet *ConstraintSet) {
	for field, constraints := range constraintSet.Constraints {
		if len(constraints) < 2 {
			continue
		}

		// Check for contradictions in this field's constraints
		contradictions := d.findContradictionsInConstraints(field, constraints)
		d.contradictions = append(d.contradictions, contradictions...)
	}
}

// findContradictionsInConstraints checks if a set of constraints on the same field contradict
func (d *LogicalContradictionDetector) findContradictionsInConstraints(field string, constraints []FieldConstraint) []string {
	contradictions := []string{}

	// Group constraints by type for easier checking
	var equalConstraints []FieldConstraint
	var notEqualConstraints []FieldConstraint
	var rangeConstraints []FieldConstraint
	var inConstraints []FieldConstraint
	var notInConstraints []FieldConstraint
	var existsConstraints []FieldConstraint
	var notExistsConstraints []FieldConstraint
	var betweenConstraints []FieldConstraint
	var notBetweenConstraints []FieldConstraint
	var likeConstraints []FieldConstraint

	for _, c := range constraints {
		switch c.Operator {
		case qbtypes.FilterOperatorEqual:
			equalConstraints = append(equalConstraints, c)
		case qbtypes.FilterOperatorNotEqual:
			notEqualConstraints = append(notEqualConstraints, c)
		case qbtypes.FilterOperatorIn:
			inConstraints = append(inConstraints, c)
		case qbtypes.FilterOperatorNotIn:
			notInConstraints = append(notInConstraints, c)
		case qbtypes.FilterOperatorExists:
			existsConstraints = append(existsConstraints, c)
		case qbtypes.FilterOperatorNotExists:
			notExistsConstraints = append(notExistsConstraints, c)
		case qbtypes.FilterOperatorBetween:
			betweenConstraints = append(betweenConstraints, c)
		case qbtypes.FilterOperatorNotBetween:
			notBetweenConstraints = append(notBetweenConstraints, c)
		case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike,
			qbtypes.FilterOperatorNotLike, qbtypes.FilterOperatorNotILike:
			likeConstraints = append(likeConstraints, c)
		default:
			// Handle range operators
			if isRangeOperator(c.Operator) {
				rangeConstraints = append(rangeConstraints, c)
			}
		}
	}

	// Check for multiple different equality constraints
	if len(equalConstraints) > 1 {
		values := make(map[string]bool)
		for _, c := range equalConstraints {
			values[fmt.Sprintf("%v", c.Value)] = true
		}
		if len(values) > 1 {
			contradictions = append(contradictions,
				fmt.Sprintf("Field '%s' cannot equal multiple different values", field))
		}
	}

	// Check equality vs not-equality
	for _, eq := range equalConstraints {
		for _, neq := range notEqualConstraints {
			if fmt.Sprintf("%v", eq.Value) == fmt.Sprintf("%v", neq.Value) {
				contradictions = append(contradictions,
					fmt.Sprintf("Field '%s' cannot both equal and not equal '%v'", field, eq.Value))
			}
		}
	}

	// Check equality vs IN/NOT IN
	for _, eq := range equalConstraints {
		// Check against NOT IN
		for _, notIn := range notInConstraints {
			for _, v := range notIn.Values {
				if fmt.Sprintf("%v", eq.Value) == fmt.Sprintf("%v", v) {
					contradictions = append(contradictions,
						fmt.Sprintf("Field '%s' equals '%v' but is in NOT IN list", field, eq.Value))
				}
			}
		}

		// Check against IN
		for _, in := range inConstraints {
			found := false
			for _, v := range in.Values {
				if fmt.Sprintf("%v", eq.Value) == fmt.Sprintf("%v", v) {
					found = true
					break
				}
			}
			if !found {
				contradictions = append(contradictions,
					fmt.Sprintf("Field '%s' equals '%v' but is not in IN list", field, eq.Value))
			}
		}
	}

	// Check IN vs NOT IN overlap
	for _, in := range inConstraints {
		for _, notIn := range notInConstraints {
			overlap := []string{}
			for _, inVal := range in.Values {
				for _, notInVal := range notIn.Values {
					if fmt.Sprintf("%v", inVal) == fmt.Sprintf("%v", notInVal) {
						overlap = append(overlap, fmt.Sprintf("%v", inVal))
					}
				}
			}
			if len(overlap) > 0 {
				contradictions = append(contradictions,
					fmt.Sprintf("Field '%s' has overlapping IN and NOT IN values: %v", field, overlap))
			}
		}
	}

	// Check range contradictions
	if len(rangeConstraints) > 0 {
		if impossible := d.checkRangeContradictions(rangeConstraints); impossible {
			contradictions = append(contradictions,
				fmt.Sprintf("Field '%s' has contradictory range constraints", field))
		}
	}

	// Check equality vs range
	for _, eq := range equalConstraints {
		if !d.valuesSatisfyRanges(eq.Value, rangeConstraints) {
			contradictions = append(contradictions,
				fmt.Sprintf("Field '%s' equals '%v' which violates range constraints", field, eq.Value))
		}
	}

	// Check EXISTS contradictions
	if len(existsConstraints) > 0 && len(notExistsConstraints) > 0 {
		contradictions = append(contradictions,
			fmt.Sprintf("Field '%s' cannot both exist and not exist", field))
	}

	// Check if NOT EXISTS contradicts with operators that imply existence
	if len(notExistsConstraints) > 0 {
		for _, c := range constraints {
			if c.Operator.AddDefaultExistsFilter() && !isNegativeOperator(c.Operator) {
				contradictions = append(contradictions,
					fmt.Sprintf("Field '%s' has NOT EXISTS but also has %v which implies existence",
						field, c.Operator))
				break
			}
		}
	}

	// Check BETWEEN contradictions - need to check if ALL ranges have a common intersection
	if len(betweenConstraints) >= 2 {
		if !d.hasCommonIntersection(betweenConstraints) {
			contradictions = append(contradictions,
				fmt.Sprintf("Field '%s' has non-overlapping BETWEEN ranges", field))
		}
	}

	// Check BETWEEN vs equality
	for _, eq := range equalConstraints {
		satisfiesAny := false
		for _, between := range betweenConstraints {
			if d.valueSatisfiesBetween(eq.Value, between) {
				satisfiesAny = true
				break
			}
		}
		if len(betweenConstraints) > 0 && !satisfiesAny {
			contradictions = append(contradictions,
				fmt.Sprintf("Field '%s' equals '%v' which is outside BETWEEN range(s)", field, eq.Value))
		}
	}

	// Check NOT BETWEEN vs equality
	for _, eq := range equalConstraints {
		for _, notBetween := range notBetweenConstraints {
			if d.valueSatisfiesBetween(eq.Value, notBetween) {
				contradictions = append(contradictions,
					fmt.Sprintf("Field '%s' equals '%v' which is excluded by NOT BETWEEN range", field, eq.Value))
			}
		}
	}

	// Check if BETWEEN and NOT BETWEEN ranges make it impossible to have any value
	if len(betweenConstraints) > 0 && len(notBetweenConstraints) > 0 {
		// Check if the NOT BETWEEN completely covers the BETWEEN range
		for _, between := range betweenConstraints {
			if len(between.Values) == 2 {
				bMin, err1 := parseNumericValue(between.Values[0])
				bMax, err2 := parseNumericValue(between.Values[1])
				if err1 == nil && err2 == nil {
					// Check if this BETWEEN range has any values not excluded by NOT BETWEEN
					hasValidValue := false
					// Simple check: see if the endpoints or midpoint are valid
					testValues := []float64{bMin, bMax, (bMin + bMax) / 2}
					for _, testVal := range testValues {
						valid := true
						for _, notBetween := range notBetweenConstraints {
							if d.valueSatisfiesBetween(testVal, notBetween) {
								valid = false
								break
							}
						}
						if valid {
							hasValidValue = true
							break
						}
					}
					if !hasValidValue {
						contradictions = append(contradictions,
							fmt.Sprintf("Field '%s' has BETWEEN and NOT BETWEEN ranges that exclude all values", field))
					}
				}
			}
		}
	}

	// Check LIKE pattern contradictions with exact values
	for _, eq := range equalConstraints {
		for _, like := range likeConstraints {
			if like.Operator == qbtypes.FilterOperatorLike || like.Operator == qbtypes.FilterOperatorILike {
				pattern := fmt.Sprintf("%v", like.Value)
				value := fmt.Sprintf("%v", eq.Value)
				if !d.matchesLikePattern(value, pattern) {
					contradictions = append(contradictions,
						fmt.Sprintf("Field '%s' equals '%v' which doesn't match LIKE pattern '%v'",
							field, eq.Value, like.Value))
				}
			}
		}
	}

	return contradictions
}

// hasCommonIntersection checks if all BETWEEN ranges have a common intersection
func (d *LogicalContradictionDetector) hasCommonIntersection(betweens []FieldConstraint) bool {
	if len(betweens) == 0 {
		return true
	}

	// Find the intersection of all ranges
	var intersectionMin, intersectionMax float64
	initialized := false

	for _, b := range betweens {
		if len(b.Values) != 2 {
			continue
		}

		min, err1 := parseNumericValue(b.Values[0])
		max, err2 := parseNumericValue(b.Values[1])
		if err1 != nil || err2 != nil {
			continue // Skip non-numeric ranges
		}

		if !initialized {
			intersectionMin = min
			intersectionMax = max
			initialized = true
		} else {
			// Update intersection
			if min > intersectionMin {
				intersectionMin = min
			}
			if max < intersectionMax {
				intersectionMax = max
			}
		}
	}

	// If intersection is empty, ranges don't all overlap
	return !initialized || intersectionMin <= intersectionMax
}

// checkRangeContradictions checks if range constraints are satisfiable
func (d *LogicalContradictionDetector) checkRangeContradictions(constraints []FieldConstraint) bool {
	// We need to find if there's any value that satisfies all constraints

	var lowerBounds []struct {
		value     float64
		inclusive bool
	}
	var upperBounds []struct {
		value     float64
		inclusive bool
	}

	for _, c := range constraints {
		val, err := parseNumericValue(c.Value)
		if err != nil {
			continue // Skip non-numeric values
		}

		switch c.Operator {
		case qbtypes.FilterOperatorGreaterThan:
			lowerBounds = append(lowerBounds, struct {
				value     float64
				inclusive bool
			}{val, false})
		case qbtypes.FilterOperatorGreaterThanOrEq:
			lowerBounds = append(lowerBounds, struct {
				value     float64
				inclusive bool
			}{val, true})
		case qbtypes.FilterOperatorLessThan:
			upperBounds = append(upperBounds, struct {
				value     float64
				inclusive bool
			}{val, false})
		case qbtypes.FilterOperatorLessThanOrEq:
			upperBounds = append(upperBounds, struct {
				value     float64
				inclusive bool
			}{val, true})
		}
	}

	// Find the most restrictive lower bound
	var effectiveLower *float64
	lowerInclusive := false
	for _, lb := range lowerBounds {
		if effectiveLower == nil || lb.value > *effectiveLower ||
			(lb.value == *effectiveLower && !lb.inclusive && lowerInclusive) {
			effectiveLower = &lb.value
			lowerInclusive = lb.inclusive
		}
	}

	// Find the most restrictive upper bound
	var effectiveUpper *float64
	upperInclusive := false
	for _, ub := range upperBounds {
		if effectiveUpper == nil || ub.value < *effectiveUpper ||
			(ub.value == *effectiveUpper && !ub.inclusive && upperInclusive) {
			effectiveUpper = &ub.value
			upperInclusive = ub.inclusive
		}
	}

	// Check if we have both bounds and they're contradictory
	if effectiveLower != nil && effectiveUpper != nil {
		if *effectiveLower > *effectiveUpper {
			return true
		}
		if *effectiveLower == *effectiveUpper && (!lowerInclusive || !upperInclusive) {
			return true
		}
	}

	return false
}

// valuesSatisfyRanges checks if a value satisfies all range constraints
func (d *LogicalContradictionDetector) valuesSatisfyRanges(value interface{}, constraints []FieldConstraint) bool {
	val, err := parseNumericValue(value)
	if err != nil {
		return true // If not numeric, we can't check
	}

	for _, c := range constraints {
		cVal, err := parseNumericValue(c.Value)
		if err != nil {
			continue
		}

		switch c.Operator {
		case qbtypes.FilterOperatorGreaterThan:
			if val <= cVal {
				return false
			}
		case qbtypes.FilterOperatorGreaterThanOrEq:
			if val < cVal {
				return false
			}
		case qbtypes.FilterOperatorLessThan:
			if val >= cVal {
				return false
			}
		case qbtypes.FilterOperatorLessThanOrEq:
			if val > cVal {
				return false
			}
		}
	}

	return true
}

// valueSatisfiesBetween checks if a value is within a BETWEEN range
func (d *LogicalContradictionDetector) valueSatisfiesBetween(value interface{}, between FieldConstraint) bool {
	if len(between.Values) != 2 {
		return false
	}

	val, err := parseNumericValue(value)
	if err != nil {
		return true // Can't check non-numeric
	}

	min, err1 := parseNumericValue(between.Values[0])
	max, err2 := parseNumericValue(between.Values[1])

	if err1 != nil || err2 != nil {
		return true
	}

	return val >= min && val <= max
}

// matchesLikePattern is a simple pattern matcher for LIKE
func (d *LogicalContradictionDetector) matchesLikePattern(value, pattern string) bool {
	// Simple implementation - just check prefix/suffix with %
	if strings.HasPrefix(pattern, "%") && strings.HasSuffix(pattern, "%") {
		return strings.Contains(value, pattern[1:len(pattern)-1])
	} else if strings.HasPrefix(pattern, "%") {
		return strings.HasSuffix(value, pattern[1:])
	} else if strings.HasSuffix(pattern, "%") {
		return strings.HasPrefix(value, pattern[:len(pattern)-1])
	}
	return value == pattern
}

// cloneConstraintSet creates a deep copy of a constraint set
func (d *LogicalContradictionDetector) cloneConstraintSet(set *ConstraintSet) *ConstraintSet {
	newSet := &ConstraintSet{
		Constraints: make(map[string][]FieldConstraint),
	}

	for field, constraints := range set.Constraints {
		newConstraints := make([]FieldConstraint, len(constraints))
		copy(newConstraints, constraints)
		newSet.Constraints[field] = newConstraints
	}

	return newSet
}

// parseNumericValue attempts to parse a value as a number
func parseNumericValue(value interface{}) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "not a numeric value")
	}
}

// negateOperator returns the negated version of an operator
func negateOperator(op qbtypes.FilterOperator) qbtypes.FilterOperator {
	switch op {
	case qbtypes.FilterOperatorEqual:
		return qbtypes.FilterOperatorNotEqual
	case qbtypes.FilterOperatorNotEqual:
		return qbtypes.FilterOperatorEqual
	case qbtypes.FilterOperatorLessThan:
		return qbtypes.FilterOperatorGreaterThanOrEq
	case qbtypes.FilterOperatorLessThanOrEq:
		return qbtypes.FilterOperatorGreaterThan
	case qbtypes.FilterOperatorGreaterThan:
		return qbtypes.FilterOperatorLessThanOrEq
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return qbtypes.FilterOperatorLessThan
	case qbtypes.FilterOperatorIn:
		return qbtypes.FilterOperatorNotIn
	case qbtypes.FilterOperatorNotIn:
		return qbtypes.FilterOperatorIn
	case qbtypes.FilterOperatorExists:
		return qbtypes.FilterOperatorNotExists
	case qbtypes.FilterOperatorNotExists:
		return qbtypes.FilterOperatorExists
	case qbtypes.FilterOperatorLike:
		return qbtypes.FilterOperatorNotLike
	case qbtypes.FilterOperatorNotLike:
		return qbtypes.FilterOperatorLike
	case qbtypes.FilterOperatorILike:
		return qbtypes.FilterOperatorNotILike
	case qbtypes.FilterOperatorNotILike:
		return qbtypes.FilterOperatorILike
	case qbtypes.FilterOperatorBetween:
		return qbtypes.FilterOperatorNotBetween
	case qbtypes.FilterOperatorNotBetween:
		return qbtypes.FilterOperatorBetween
	case qbtypes.FilterOperatorRegexp:
		return qbtypes.FilterOperatorNotRegexp
	case qbtypes.FilterOperatorNotRegexp:
		return qbtypes.FilterOperatorRegexp
	case qbtypes.FilterOperatorContains:
		return qbtypes.FilterOperatorNotContains
	case qbtypes.FilterOperatorNotContains:
		return qbtypes.FilterOperatorContains
	default:
		return op
	}
}

// isRangeOperator returns true if the operator is a range comparison operator
func isRangeOperator(op qbtypes.FilterOperator) bool {
	switch op {
	case qbtypes.FilterOperatorLessThan,
		qbtypes.FilterOperatorLessThanOrEq,
		qbtypes.FilterOperatorGreaterThan,
		qbtypes.FilterOperatorGreaterThanOrEq:
		return true
	default:
		return false
	}
}

// isNegativeOperator returns true if the operator is a negative/exclusion operator
func isNegativeOperator(op qbtypes.FilterOperator) bool {
	switch op {
	case qbtypes.FilterOperatorNotEqual,
		qbtypes.FilterOperatorNotIn,
		qbtypes.FilterOperatorNotExists,
		qbtypes.FilterOperatorNotLike,
		qbtypes.FilterOperatorNotILike,
		qbtypes.FilterOperatorNotBetween,
		qbtypes.FilterOperatorNotRegexp,
		qbtypes.FilterOperatorNotContains:
		return true
	default:
		return false
	}
}
