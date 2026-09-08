package sqlrulestore

import (
	"fmt"
	"slices"
	"strings"

	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/parser/filterquery/sqlcompiler"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

const (
	ruleDataColumn  = "rule.data"
	ruleLabelsField = "labels"
	nameJSONPath    = "$.alert"
	descriptionPath = "$.description"
	labelsJSONPath  = "$.labels"
	alertTypePath   = "$.alertType"
	ruleTypePath    = "$.ruleType"
)

// ruleFieldResolver is the rules-list policy for the shared filter query
// compiler. Label keys are matched case-sensitively; an unknown key is
// rejected rather than silently matching nothing.
type ruleFieldResolver struct{}

func (r ruleFieldResolver) ResolveComparison(b *sqlcompiler.Builder, rawKey string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	key := strings.ToLower(rawKey)

	if allowedOperations, isReserved := ruletypes.ReservedOps[ruletypes.DSLKey(key)]; isReserved {
		return r.resolveReservedKey(b, ctx, operation, ruletypes.DSLKey(key), allowedOperations)
	}

	if strings.HasPrefix(key, ruletypes.DSLLabelsKeyPrefix) {
		labelKey := rawKey[len(ruletypes.DSLLabelsKeyPrefix):]
		if labelKey == "" {
			b.AddError("labels filter is missing a key, use labels.<key>")
			return ""
		}
		if _, allowed := ruletypes.LabelsKeyOps[operation]; !allowed {
			b.AddError("operator %s is not allowed on a labels.<key> filter", sqlcompiler.OperationName(operation))
			return ""
		}
		return r.labelComparison(b, ctx, operation, labelKey)
	}

	b.AddError("unknown filter key %q, use one of the reserved keys or labels.<key>", rawKey)
	return ""
}

func (r ruleFieldResolver) resolveReservedKey(b *sqlcompiler.Builder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		b.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
		return ""
	}
	switch key {
	case ruletypes.DSLKeyName:
		columnExpression := string(b.Formatter().JSONExtractString(ruleDataColumn, nameJSONPath))
		return b.StringOperation(b.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case ruletypes.DSLKeySeverity:
		// severity is an alias for labels.severity and shares its semantics,
		// including negations matching rules that carry no severity at all.
		return r.labelComparison(b, ctx, operation, "severity")
	case ruletypes.DSLKeyCreatedBy:
		return b.StringOperation(b.SelectBuilder(), ctx, operation, "rule.created_by", string(key))
	case ruletypes.DSLKeyUpdatedBy:
		return b.StringOperation(b.SelectBuilder(), ctx, operation, "rule.updated_by", string(key))
	case ruletypes.DSLKeyCreatedAt:
		return b.TimestampComparison(ctx, operation, "rule.created_at")
	case ruletypes.DSLKeyUpdatedAt:
		return b.TimestampComparison(ctx, operation, "rule.updated_at")
	case ruletypes.DSLKeyAlertType:
		return r.enumComparison(b, ctx, operation, key, alertTypePath, alertTypeValues())
	case ruletypes.DSLKeyRuleType:
		return r.enumComparison(b, ctx, operation, key, ruleTypePath, ruleTypeValues())
	}
	b.AddError("no handler for reserved key %q", key)
	return ""
}

// labelComparison builds a predicate on one label's value. A missing label
// uniformly evaluates as the empty string (COALESCE) for every value operator,
// so `!= 'x'` matches label-less rules, `!= ''` does not, and `= ''` does.
// Presence itself is expressed with EXISTS/NOT EXISTS on the raw extraction.
func (ruleFieldResolver) labelComparison(b *sqlcompiler.Builder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, labelKey string) string {
	columnExpression := string(b.Formatter().JSONExtractMapValue(ruleDataColumn, ruleLabelsField, labelKey))

	switch operation {
	case qbtypesv5.FilterOperatorExists:
		return fmt.Sprintf("%s IS NOT NULL", columnExpression)
	case qbtypesv5.FilterOperatorNotExists:
		return fmt.Sprintf("%s IS NULL", columnExpression)
	}

	keyForError := ruletypes.DSLLabelsKeyPrefix + labelKey
	columnExpression = fmt.Sprintf("COALESCE(%s, '')", columnExpression)
	return b.StringOperation(b.SelectBuilder(), ctx, operation, columnExpression, keyForError)
}

func (ruleFieldResolver) enumComparison(b *sqlcompiler.Builder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, jsonPath string, allowedValues []string) string {
	columnExpression := string(b.Formatter().JSONExtractString(ruleDataColumn, jsonPath))

	var values []string
	switch operation {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual:
		value, ok := b.ExtractSingleStringValue(ctx, string(key))
		if !ok {
			return ""
		}
		values = []string{value}
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		list, ok := b.ExtractStringValueList(ctx, string(key))
		if !ok {
			return ""
		}
		values = list
	default:
		b.AddError("operator %s on %q is not implemented", sqlcompiler.OperationName(operation), key)
		return ""
	}

	for _, value := range values {
		if !slices.Contains(allowedValues, value) {
			b.AddError("invalid value %q for %q, expected one of: %s", value, key, strings.Join(allowedValues, ", "))
			return ""
		}
	}

	arguments := make([]any, len(values))
	for i, s := range values {
		arguments[i] = s
	}
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		return b.SelectBuilder().Equal(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotEqual:
		return b.SelectBuilder().NotEqual(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotIn:
		return b.SelectBuilder().NotIn(columnExpression, arguments...)
	default:
		return b.SelectBuilder().In(columnExpression, arguments...)
	}
}

// FreeText matches value as a case-insensitive substring of the rule name,
// description, or any label key/value (the labels JSON is matched as raw
// text, which also matches keys).
func (ruleFieldResolver) FreeText(b *sqlcompiler.Builder, value string) string {
	nameColumn := string(b.Formatter().JSONExtractString(ruleDataColumn, nameJSONPath))
	descriptionColumn := string(b.Formatter().JSONExtractString(ruleDataColumn, descriptionPath))
	labelsColumn := string(b.Formatter().JSONExtractString(ruleDataColumn, labelsJSONPath))

	return b.SelectBuilder().Or(
		b.FreeTextContains(b.SelectBuilder(), nameColumn, value),
		b.FreeTextContains(b.SelectBuilder(), descriptionColumn, value),
		b.FreeTextContains(b.SelectBuilder(), labelsColumn, value),
	)
}

func alertTypeValues() []string {
	values := make([]string, 0, 4)
	for _, value := range (ruletypes.AlertType("")).Enum() {
		values = append(values, string(value.(ruletypes.AlertType)))
	}
	return values
}

func ruleTypeValues() []string {
	values := make([]string, 0, 3)
	for _, value := range (ruletypes.RuleType{}).Enum() {
		values = append(values, value.(ruletypes.RuleType).StringValue())
	}
	return values
}
