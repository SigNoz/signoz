package impldashboard

import (
	"strings"

	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/parser/filterquery/sqlcompiler"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// dashboardFieldResolver maps dashboard list DSL keys; a non-reserved key is a tag key matched case-insensitively.
type dashboardFieldResolver struct{}

func (r dashboardFieldResolver) ResolveComparison(v *sqlcompiler.Visitor, rawKey string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	key := strings.ToLower(rawKey)

	if allowedOperations, isReserved := dashboardtypes.ReservedOps[dashboardtypes.DSLKey(key)]; isReserved {
		return r.resolveReservedKey(v, ctx, operation, dashboardtypes.DSLKey(key), allowedOperations)
	}

	if _, allowed := dashboardtypes.TagKeyOps[operation]; !allowed {
		v.AddError("operator %s is not allowed on a tag-key filter", sqlcompiler.OperationName(operation))
		return ""
	}
	return r.tagComparison(v, ctx, operation, key)
}

func (r dashboardFieldResolver) resolveReservedKey(v *sqlcompiler.Visitor, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key dashboardtypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		v.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
		return ""
	}
	switch key {
	case dashboardtypes.DSLKeyName:
		columnExpression := string(v.Formatter().JSONExtractString("dashboard.data", "$.spec.display.name"))
		return v.StringOperation(v.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case dashboardtypes.DSLKeyDescription:
		columnExpression := string(v.Formatter().JSONExtractString("dashboard.data", "$.spec.display.description"))
		return v.StringOperation(v.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case dashboardtypes.DSLKeyCreatedAt:
		return v.TimestampComparison(ctx, operation, "dashboard.created_at")
	case dashboardtypes.DSLKeyUpdatedAt:
		return v.TimestampComparison(ctx, operation, "dashboard.updated_at")
	case dashboardtypes.DSLKeyCreatedBy:
		return v.StringOperation(v.SelectBuilder(), ctx, operation, "dashboard.created_by", string(key))
	case dashboardtypes.DSLKeyLocked:
		return v.BoolComparison(ctx, operation, "dashboard.locked")
	}
	v.AddError("no handler for reserved key %q", key)
	return ""
}

func (dashboardFieldResolver) tagComparison(v *sqlcompiler.Visitor, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, tagKey string) string {
	subqueryBuilder := sqlbuilder.NewSelectBuilder()

	if operation == qbtypesv5.FilterOperatorExists || operation == qbtypesv5.FilterOperatorNotExists {
		buildSubqueryForTagKey(subqueryBuilder, tagKey)
	} else {
		// Value predicates take the positive operator; negation toggles the EXISTS wrapper.
		positiveOperation := operation
		if operation.IsNegativeOperator() {
			positiveOperation = operation.Inverse()
		}
		valuePredicate := v.StringOperation(subqueryBuilder, ctx, positiveOperation, "t.value", tagKey)
		if valuePredicate == "" {
			return ""
		}
		buildSubqueryForTagKeyAndValue(subqueryBuilder, tagKey, valuePredicate)
	}

	if operation.IsNegativeOperator() {
		return v.SelectBuilder().NotExists(subqueryBuilder)
	}
	return v.SelectBuilder().Exists(subqueryBuilder)
}

func buildSubqueryForTagKey(subqueryBuilder *sqlbuilder.SelectBuilder, tagKey string) *sqlbuilder.SelectBuilder {
	const dashboardTagKind = `"dashboard"`

	return subqueryBuilder.
		Select("1").
		From("tag_relation tr").
		Join("tag t", "t.id = tr.tag_id").
		Where(
			subqueryBuilder.Equal("tr.kind", dashboardTagKind),
			"tr.resource_id = dashboard.id",
			"LOWER(t.key) = LOWER("+subqueryBuilder.Var(tagKey)+")",
		)
}

func buildSubqueryForTagKeyAndValue(subqueryBuilder *sqlbuilder.SelectBuilder, tagKey, valuePredicate string) *sqlbuilder.SelectBuilder {
	return buildSubqueryForTagKey(subqueryBuilder, tagKey).Where(valuePredicate)
}

// FreeText searches name, description and tag keys/values.
func (dashboardFieldResolver) FreeText(v *sqlcompiler.Visitor, value string) string {
	nameColumn := string(v.Formatter().JSONExtractString("dashboard.data", "$.spec.display.name"))
	descriptionColumn := string(v.Formatter().JSONExtractString("dashboard.data", "$.spec.display.description"))
	namePredicate := v.FreeTextContains(v.SelectBuilder(), nameColumn, value)
	descriptionPredicate := v.FreeTextContains(v.SelectBuilder(), descriptionColumn, value)

	subqueryBuilder := sqlbuilder.NewSelectBuilder()
	keyPredicate := v.FreeTextContains(subqueryBuilder, "t.key", value)
	valuePredicate := v.FreeTextContains(subqueryBuilder, "t.value", value)
	buildSubqueryForFreeTextTag(subqueryBuilder, keyPredicate, valuePredicate)
	tagPredicate := v.SelectBuilder().Exists(subqueryBuilder)

	return v.SelectBuilder().Or(namePredicate, descriptionPredicate, tagPredicate)
}

func buildSubqueryForFreeTextTag(subqueryBuilder *sqlbuilder.SelectBuilder, keyPredicate, valuePredicate string) *sqlbuilder.SelectBuilder {
	const dashboardTagKind = `"dashboard"`

	return subqueryBuilder.
		Select("1").
		From("tag_relation tr").
		Join("tag t", "t.id = tr.tag_id").
		Where(
			subqueryBuilder.Equal("tr.kind", dashboardTagKind),
			"tr.resource_id = dashboard.id",
			subqueryBuilder.Or(keyPredicate, valuePredicate),
		)
}
