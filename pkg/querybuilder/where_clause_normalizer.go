package querybuilder

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

const WhereClauseOperatorFullText = "FULLTEXT"

type NormalizedWhereClause struct {
	Expression string
	Conditions []WhereClauseCondition
}

type WhereClauseCondition struct {
	Key      string
	Operator string
	Values   []string
	Negated  bool
	TopLevel bool
}

type joinKind int

const (
	joinKindNone joinKind = iota
	joinKindAnd
	joinKindOr
)

type normalizedPart struct {
	text    string
	join    joinKind
	skipped bool
}

type normalizedValue struct {
	text string
	raw  string
}

type whereClauseNormalizer struct {
	variables  map[string]qbtypes.VariableItem
	conditions []WhereClauseCondition
	negated    bool
	orDepth    int
	errors     []string
}

func NormalizeWhereClause(expression string, variables map[string]qbtypes.VariableItem) (*NormalizedWhereClause, error) {
	input := antlr.NewInputStream(expression)
	lexer := grammar.NewFilterQueryLexer(input)

	lexerErrorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)

	parserErrorListener := NewErrorListener()
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	tree := parser.Query()

	syntaxErrors := append(lexerErrorListener.SyntaxErrors, parserErrorListener.SyntaxErrors...)
	if len(syntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d syntax errors while parsing the filter expression.",
			len(syntaxErrors),
		)
		additionals := make([]string, 0, len(syntaxErrors))
		for _, syntaxError := range syntaxErrors {
			if syntaxError.Error() != "" {
				additionals = append(additionals, syntaxError.Error())
			}
		}

		return nil, combinedErrors.WithAdditional(additionals...).WithUrl(searchTroubleshootingGuideURL)
	}

	visitor := &whereClauseNormalizer{
		variables:  variables,
		conditions: make([]WhereClauseCondition, 0),
	}
	part := visitor.visitQuery(tree)

	if len(visitor.errors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d errors while parsing the filter expression.",
			len(visitor.errors),
		)
		return nil, combinedErrors.WithAdditional(visitor.errors...).WithUrl(searchTroubleshootingGuideURL)
	}

	if part.skipped {
		return &NormalizedWhereClause{Expression: "", Conditions: make([]WhereClauseCondition, 0)}, nil
	}

	sort.Slice(visitor.conditions, func(i, j int) bool {
		return visitor.conditions[i].sortKey() < visitor.conditions[j].sortKey()
	})

	return &NormalizedWhereClause{Expression: part.text, Conditions: visitor.conditions}, nil
}

func (condition WhereClauseCondition) sortKey() string {
	return condition.Key + "|" + condition.Operator + "|" + strings.Join(condition.Values, ",") + "|" + strconv.FormatBool(condition.Negated) + "|" + strconv.FormatBool(condition.TopLevel)
}

func (visitor *whereClauseNormalizer) visitQuery(ctx grammar.IQueryContext) normalizedPart {
	if ctx.Expression() == nil {
		return normalizedPart{skipped: true}
	}

	return visitor.visitOrExpression(ctx.Expression().OrExpression())
}

func (visitor *whereClauseNormalizer) visitOrExpression(ctx grammar.IOrExpressionContext) normalizedPart {
	andExpressions := ctx.AllAndExpression()
	if len(andExpressions) > 1 {
		visitor.orDepth++
		defer func() { visitor.orDepth-- }()
	}

	parts := make([]normalizedPart, 0, len(andExpressions))
	for _, andExpression := range andExpressions {
		part := visitor.visitAndExpression(andExpression)
		if part.skipped {
			continue
		}
		parts = append(parts, part)
	}

	if len(parts) == 0 {
		return normalizedPart{skipped: true}
	}

	parts = sortAndDedupeNormalizedParts(parts)
	if len(parts) == 1 {
		return parts[0]
	}

	texts := make([]string, len(parts))
	for index, part := range parts {
		texts[index] = part.text
	}

	return normalizedPart{text: strings.Join(texts, " OR "), join: joinKindOr}
}

func (visitor *whereClauseNormalizer) visitAndExpression(ctx grammar.IAndExpressionContext) normalizedPart {
	unaryExpressions := ctx.AllUnaryExpression()
	parts := make([]normalizedPart, 0, len(unaryExpressions))
	for _, unaryExpression := range unaryExpressions {
		part := visitor.visitUnaryExpression(unaryExpression)
		if part.skipped {
			continue
		}
		if part.join == joinKindOr {
			part = normalizedPart{text: "(" + part.text + ")", join: joinKindNone}
		}
		parts = append(parts, part)
	}

	if len(parts) == 0 {
		return normalizedPart{skipped: true}
	}

	parts = sortAndDedupeNormalizedParts(parts)
	if len(parts) == 1 {
		return parts[0]
	}

	texts := make([]string, len(parts))
	for index, part := range parts {
		texts[index] = part.text
	}

	return normalizedPart{text: strings.Join(texts, " AND "), join: joinKindAnd}
}

func (visitor *whereClauseNormalizer) visitUnaryExpression(ctx grammar.IUnaryExpressionContext) normalizedPart {
	negated := ctx.NOT() != nil
	if negated {
		visitor.negated = !visitor.negated
	}

	part := visitor.visitPrimary(ctx.Primary())

	if negated {
		visitor.negated = !visitor.negated

		if part.skipped {
			return part
		}
		if part.join != joinKindNone {
			return normalizedPart{text: "NOT (" + part.text + ")", join: joinKindNone}
		}
		return normalizedPart{text: "NOT " + part.text, join: joinKindNone}
	}

	return part
}

func (visitor *whereClauseNormalizer) visitPrimary(ctx grammar.IPrimaryContext) normalizedPart {
	if ctx.OrExpression() != nil {
		return visitor.visitOrExpression(ctx.OrExpression())
	}
	if ctx.Comparison() != nil {
		return visitor.visitComparison(ctx.Comparison())
	}
	if ctx.FunctionCall() != nil {
		return normalizedPart{text: visitor.visitFunctionCall(ctx.FunctionCall())}
	}
	if ctx.FullText() != nil {
		return normalizedPart{text: visitor.visitFullText(ctx.FullText())}
	}
	if ctx.Key() != nil {
		return normalizedPart{text: visitor.fullTextTerm(ctx.Key().GetText())}
	}
	if ctx.Value() != nil {
		value := visitor.normalizeValue(ctx.Value())
		return normalizedPart{text: visitor.fullTextTerm(value.raw)}
	}

	return normalizedPart{skipped: true}
}

func (visitor *whereClauseNormalizer) visitComparison(ctx grammar.IComparisonContext) normalizedPart {
	key := normalizeKeyText(ctx.Key().GetText())

	if ctx.EXISTS() != nil {
		operator := "EXISTS"
		if ctx.NOT() != nil {
			operator = "NOT EXISTS"
		}
		visitor.appendCondition(key, operator, nil)
		return normalizedPart{text: key + " " + operator}
	}

	if ctx.InClause() != nil {
		return visitor.visitInComparison(key, "IN", visitor.visitInValues(ctx.InClause().ValueList(), ctx.InClause().Value()))
	}

	if ctx.NotInClause() != nil {
		return visitor.visitInComparison(key, "NOT IN", visitor.visitInValues(ctx.NotInClause().ValueList(), ctx.NotInClause().Value()))
	}

	if ctx.BETWEEN() != nil {
		operator := "BETWEEN"
		if ctx.NOT() != nil {
			operator = "NOT BETWEEN"
		}

		values := ctx.AllValue()
		low := visitor.normalizeValue(values[0])
		high := visitor.normalizeValue(values[1])
		visitor.appendCondition(key, operator, []string{low.raw, high.raw})
		return normalizedPart{text: key + " " + operator + " " + low.text + " AND " + high.text}
	}

	operator := ""
	switch {
	case ctx.EQUALS() != nil:
		operator = "="
	case ctx.NOT_EQUALS() != nil, ctx.NEQ() != nil:
		operator = "!="
	case ctx.LT() != nil:
		operator = "<"
	case ctx.LE() != nil:
		operator = "<="
	case ctx.GT() != nil:
		operator = ">"
	case ctx.GE() != nil:
		operator = ">="
	case ctx.LIKE() != nil:
		operator = "LIKE"
	case ctx.ILIKE() != nil:
		operator = "ILIKE"
	case ctx.REGEXP() != nil:
		operator = "REGEXP"
	case ctx.CONTAINS() != nil:
		operator = "CONTAINS"
	}
	if ctx.NOT() != nil {
		operator = "NOT " + operator
	}

	value, skipped := visitor.substituteScalarVariable(visitor.normalizeValue(ctx.AllValue()[0]))
	if skipped {
		return normalizedPart{skipped: true}
	}

	visitor.appendCondition(key, operator, []string{value.raw})
	return normalizedPart{text: key + " " + operator + " " + value.text}
}

func (visitor *whereClauseNormalizer) visitInComparison(key, operator string, values []normalizedValue) normalizedPart {
	values, skipped := visitor.substituteListVariable(values)
	if skipped {
		return normalizedPart{skipped: true}
	}

	sort.Slice(values, func(i, j int) bool { return values[i].text < values[j].text })

	texts := make([]string, 0, len(values))
	raws := make([]string, 0, len(values))
	for index, value := range values {
		if index > 0 && value.text == values[index-1].text {
			continue
		}
		texts = append(texts, value.text)
		raws = append(raws, value.raw)
	}

	visitor.appendCondition(key, operator, raws)
	return normalizedPart{text: key + " " + operator + " (" + strings.Join(texts, ", ") + ")"}
}

func (visitor *whereClauseNormalizer) visitInValues(valueList grammar.IValueListContext, value grammar.IValueContext) []normalizedValue {
	values := make([]normalizedValue, 0)
	if valueList != nil {
		for _, valueCtx := range valueList.AllValue() {
			values = append(values, visitor.normalizeValue(valueCtx))
		}
		return values
	}

	return append(values, visitor.normalizeValue(value))
}

func (visitor *whereClauseNormalizer) visitFunctionCall(ctx grammar.IFunctionCallContext) string {
	functionName := ""
	switch {
	case ctx.HAS() != nil:
		functionName = "has"
	case ctx.HASANY() != nil:
		functionName = "hasAny"
	case ctx.HASALL() != nil:
		functionName = "hasAll"
	case ctx.HASTOKEN() != nil:
		functionName = "hasToken"
	}

	key := ""
	texts := make([]string, 0)
	raws := make([]string, 0)
	for index, param := range ctx.FunctionParamList().AllFunctionParam() {
		switch {
		case param.Key() != nil:
			keyText := normalizeKeyText(param.Key().GetText())
			if index == 0 {
				key = keyText
			} else {
				raws = append(raws, keyText)
			}
			texts = append(texts, keyText)
		case param.Value() != nil:
			value := visitor.normalizeValue(param.Value())
			texts = append(texts, value.text)
			raws = append(raws, value.raw)
		case param.Array() != nil:
			arrayText, arrayRaws := visitor.visitArray(param.Array())
			texts = append(texts, arrayText)
			raws = append(raws, arrayRaws...)
		}
	}

	visitor.appendCondition(key, functionName, raws)
	return functionName + "(" + strings.Join(texts, ", ") + ")"
}

func (visitor *whereClauseNormalizer) visitArray(ctx grammar.IArrayContext) (string, []string) {
	texts := make([]string, 0)
	raws := make([]string, 0)
	for _, valueCtx := range ctx.ValueList().AllValue() {
		value := visitor.normalizeValue(valueCtx)
		texts = append(texts, value.text)
		raws = append(raws, value.raw)
	}

	return "[" + strings.Join(texts, ", ") + "]", raws
}

func (visitor *whereClauseNormalizer) visitFullText(ctx grammar.IFullTextContext) string {
	if ctx.QUOTED_TEXT() != nil {
		return visitor.fullTextTerm(trimQuotes(ctx.QUOTED_TEXT().GetText()))
	}

	return visitor.fullTextTerm(ctx.FREETEXT().GetText())
}

func (visitor *whereClauseNormalizer) fullTextTerm(term string) string {
	visitor.appendCondition("", WhereClauseOperatorFullText, []string{term})
	return quoteValue(term)
}

func (visitor *whereClauseNormalizer) normalizeValue(ctx grammar.IValueContext) normalizedValue {
	switch {
	case ctx.QUOTED_TEXT() != nil:
		raw := trimQuotes(ctx.QUOTED_TEXT().GetText())
		return normalizedValue{text: quoteValue(raw), raw: raw}
	case ctx.NUMBER() != nil:
		text := ctx.NUMBER().GetText()
		return normalizedValue{text: text, raw: text}
	case ctx.BOOL() != nil:
		text := strings.ToLower(ctx.BOOL().GetText())
		return normalizedValue{text: text, raw: text}
	default:
		raw := ctx.KEY().GetText()
		if strings.HasPrefix(raw, "$") {
			return normalizedValue{text: raw, raw: raw}
		}
		return normalizedValue{text: quoteValue(raw), raw: raw}
	}
}

func (visitor *whereClauseNormalizer) appendCondition(key, operator string, values []string) {
	if values == nil {
		values = make([]string, 0)
	}

	visitor.conditions = append(visitor.conditions, WhereClauseCondition{
		Key:      key,
		Operator: operator,
		Values:   values,
		Negated:  visitor.negated,
		TopLevel: visitor.orDepth == 0 && !visitor.negated,
	})
}

func (visitor *whereClauseNormalizer) substituteScalarVariable(value normalizedValue) (normalizedValue, bool) {
	variableItem, ok := visitor.resolveVariable(value.raw)
	if !ok {
		return value, false
	}

	if skipped := visitor.errIfSkippedOrEmpty(variableItem, value.raw); skipped {
		return normalizedValue{}, true
	}

	switch variableValues := variableItem.Value.(type) {
	case []any:
		return formatVariableValue(variableValues[0]), false
	case any:
		return formatVariableValue(variableValues), false
	}

	return value, false
}

func (visitor *whereClauseNormalizer) substituteListVariable(values []normalizedValue) ([]normalizedValue, bool) {
	if len(values) != 1 {
		return values, false
	}

	variableItem, ok := visitor.resolveVariable(values[0].raw)
	if !ok {
		return values, false
	}

	if skipped := visitor.errIfSkippedOrEmpty(variableItem, values[0].raw); skipped {
		return nil, true
	}

	switch variableValues := variableItem.Value.(type) {
	case []any:
		substituted := make([]normalizedValue, 0, len(variableValues))
		for _, variableValue := range variableValues {
			substituted = append(substituted, formatVariableValue(variableValue))
		}
		return substituted, false
	case any:
		return []normalizedValue{formatVariableValue(variableValues)}, false
	}

	return values, false
}

func (visitor *whereClauseNormalizer) errIfSkippedOrEmpty(variableItem qbtypes.VariableItem, raw string) bool {
	if variableItem.Type == qbtypes.DynamicVariableType {
		if allValue, ok := variableItem.Value.(string); ok && allValue == "__all__" {
			return true
		}
	}

	if variableValues, ok := variableItem.Value.([]any); ok && len(variableValues) == 0 {
		visitor.errors = append(visitor.errors, fmt.Sprintf("malformed request payload: variable `%s` used in expression has an empty list value", strings.TrimPrefix(raw, "$")))
		return true
	}

	return false
}

func (visitor *whereClauseNormalizer) resolveVariable(raw string) (qbtypes.VariableItem, bool) {
	if len(visitor.variables) == 0 {
		return qbtypes.VariableItem{}, false
	}

	variableItem, ok := visitor.variables[raw]
	if !ok && len(raw) > 0 {
		variableItem, ok = visitor.variables[raw[1:]]
	}

	return variableItem, ok
}

func formatVariableValue(value any) normalizedValue {
	switch typed := value.(type) {
	case string:
		return normalizedValue{text: quoteValue(typed), raw: typed}
	case bool:
		text := strconv.FormatBool(typed)
		return normalizedValue{text: text, raw: text}
	default:
		text := fmt.Sprintf("%v", typed)
		return normalizedValue{text: text, raw: text}
	}
}

func normalizeKeyText(keyText string) string {
	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(keyText)
	return telemetrytypes.TelemetryFieldKeyToText(&fieldKey)
}

func quoteValue(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `'`, `\'`)
	return "'" + escaped + "'"
}

func sortAndDedupeNormalizedParts(parts []normalizedPart) []normalizedPart {
	sort.Slice(parts, func(i, j int) bool { return parts[i].text < parts[j].text })

	deduped := parts[:0]
	for index, part := range parts {
		if index > 0 && part.text == parts[index-1].text {
			continue
		}
		deduped = append(deduped, part)
	}

	return deduped
}
