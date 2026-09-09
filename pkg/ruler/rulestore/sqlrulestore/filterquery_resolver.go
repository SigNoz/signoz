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

// ruleFieldResolver maps rule list DSL keys; label keys are case-sensitive and unknown keys are rejected.
type ruleFieldResolver struct{}

func (r ruleFieldResolver) ResolveComparison(v *sqlcompiler.Visitor, rawKey string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	key := strings.ToLower(rawKey)

	if allowedOperations, isReserved := ruletypes.ReservedOps[ruletypes.DSLKey(key)]; isReserved {
		return r.resolveReservedKey(v, ctx, operation, ruletypes.DSLKey(key), allowedOperations)
	}

	if strings.HasPrefix(key, ruletypes.DSLLabelsKeyPrefix) {
		labelKey := rawKey[len(ruletypes.DSLLabelsKeyPrefix):]
		if labelKey == "" {
			v.AddError("labels filter is missing a key, use labels.<key>")
			return ""
		}
		if _, allowed := ruletypes.LabelsKeyOps[operation]; !allowed {
			v.AddError("operator %s is not allowed on a labels.<key> filter", sqlcompiler.OperationName(operation))
			return ""
		}
		return r.labelComparison(v, ctx, operation, labelKey)
	}

	v.AddError("unknown filter key %q, use one of the reserved keys or labels.<key>", rawKey)
	return ""
}

func (r ruleFieldResolver) resolveReservedKey(v *sqlcompiler.Visitor, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		v.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
		return ""
	}
	switch key {
	case ruletypes.DSLKeyName:
		columnExpression := string(v.Formatter().JSONExtractString(ruleDataColumn, nameJSONPath))
		return v.StringOperation(v.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case ruletypes.DSLKeySeverity:
		// severity is an alias for labels.severity, sharing its missing-label semantics.
		return r.labelComparison(v, ctx, operation, "severity")
	case ruletypes.DSLKeyCreatedBy:
		return v.StringOperation(v.SelectBuilder(), ctx, operation, "rule.created_by", string(key))
	case ruletypes.DSLKeyUpdatedBy:
		return v.StringOperation(v.SelectBuilder(), ctx, operation, "rule.updated_by", string(key))
	case ruletypes.DSLKeyCreatedAt:
		return v.TimestampComparison(ctx, operation, "rule.created_at")
	case ruletypes.DSLKeyUpdatedAt:
		return v.TimestampComparison(ctx, operation, "rule.updated_at")
	case ruletypes.DSLKeyAlertType:
		return r.enumComparison(v, ctx, operation, key, alertTypePath, alertTypeValues)
	case ruletypes.DSLKeyRuleType:
		return r.enumComparison(v, ctx, operation, key, ruleTypePath, ruleTypeValues)
	}
	v.AddError("no handler for reserved key %q", key)
	return ""
}

// A missing label evaluates as the empty string for every value operator; EXISTS/NOT EXISTS test the raw extraction.
func (ruleFieldResolver) labelComparison(v *sqlcompiler.Visitor, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, labelKey string) string {
	columnExpression := string(v.Formatter().JSONExtractMapValue(ruleDataColumn, ruleLabelsField, labelKey))

	switch operation {
	case qbtypesv5.FilterOperatorExists:
		return fmt.Sprintf("%s IS NOT NULL", columnExpression)
	case qbtypesv5.FilterOperatorNotExists:
		return fmt.Sprintf("%s IS NULL", columnExpression)
	}

	keyForError := ruletypes.DSLLabelsKeyPrefix + labelKey
	columnExpression = fmt.Sprintf("COALESCE(%s, '')", columnExpression)
	return v.StringOperation(v.SelectBuilder(), ctx, operation, columnExpression, keyForError)
}

func (ruleFieldResolver) enumComparison(v *sqlcompiler.Visitor, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, jsonPath string, allowedValues []string) string {
	columnExpression := string(v.Formatter().JSONExtractString(ruleDataColumn, jsonPath))

	var values []string
	switch operation {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual:
		value, ok := v.ExtractSingleStringValue(ctx, string(key))
		if !ok {
			return ""
		}
		values = []string{value}
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		list, ok := v.ExtractStringValueList(ctx, string(key))
		if !ok {
			return ""
		}
		values = list
	default:
		v.AddError("operator %s on %q is not implemented", sqlcompiler.OperationName(operation), key)
		return ""
	}

	for _, value := range values {
		if !slices.Contains(allowedValues, value) {
			v.AddError("invalid value %q for %q, expected one of: %s", value, key, strings.Join(allowedValues, ", "))
			return ""
		}
	}

	arguments := make([]any, len(values))
	for i, s := range values {
		arguments[i] = s
	}
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		return v.SelectBuilder().Equal(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotEqual:
		return v.SelectBuilder().NotEqual(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotIn:
		return v.SelectBuilder().NotIn(columnExpression, arguments...)
	default:
		return v.SelectBuilder().In(columnExpression, arguments...)
	}
}

// FreeText searches name, description and the raw labels JSON (which also matches label keys).
func (ruleFieldResolver) FreeText(v *sqlcompiler.Visitor, value string) string {
	nameColumn := string(v.Formatter().JSONExtractString(ruleDataColumn, nameJSONPath))
	descriptionColumn := string(v.Formatter().JSONExtractString(ruleDataColumn, descriptionPath))
	labelsColumn := string(v.Formatter().JSONExtractString(ruleDataColumn, labelsJSONPath))

	return v.SelectBuilder().Or(
		v.FreeTextContains(v.SelectBuilder(), nameColumn, value),
		v.FreeTextContains(v.SelectBuilder(), descriptionColumn, value),
		v.FreeTextContains(v.SelectBuilder(), labelsColumn, value),
	)
}

var alertTypeValues = func() []string {
	values := make([]string, 0, 4)
	for _, value := range (ruletypes.AlertType("")).Enum() {
		values = append(values, string(value.(ruletypes.AlertType)))
	}
	return values
}()

var ruleTypeValues = func() []string {
	values := make([]string, 0, 3)
	for _, value := range (ruletypes.RuleType{}).Enum() {
		values = append(values, value.(ruletypes.RuleType).StringValue())
	}
	return values
}()
