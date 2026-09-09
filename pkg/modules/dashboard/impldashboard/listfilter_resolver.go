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

func (r dashboardFieldResolver) ResolveComparison(b *sqlcompiler.Builder, rawKey string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	key := strings.ToLower(rawKey)

	if allowedOperations, isReserved := dashboardtypes.ReservedOps[dashboardtypes.DSLKey(key)]; isReserved {
		return r.resolveReservedKey(b, ctx, operation, dashboardtypes.DSLKey(key), allowedOperations)
	}

	if _, allowed := dashboardtypes.TagKeyOps[operation]; !allowed {
		b.AddError("operator %s is not allowed on a tag-key filter", sqlcompiler.OperationName(operation))
		return ""
	}
	return r.tagComparison(b, ctx, operation, key)
}

func (r dashboardFieldResolver) resolveReservedKey(b *sqlcompiler.Builder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key dashboardtypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		b.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
		return ""
	}
	switch key {
	case dashboardtypes.DSLKeyName:
		columnExpression := string(b.Formatter().JSONExtractString("dashboard.data", "$.spec.display.name"))
		return b.StringOperation(b.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case dashboardtypes.DSLKeyDescription:
		columnExpression := string(b.Formatter().JSONExtractString("dashboard.data", "$.spec.display.description"))
		return b.StringOperation(b.SelectBuilder(), ctx, operation, columnExpression, string(key))
	case dashboardtypes.DSLKeyCreatedAt:
		return b.TimestampComparison(ctx, operation, "dashboard.created_at")
	case dashboardtypes.DSLKeyUpdatedAt:
		return b.TimestampComparison(ctx, operation, "dashboard.updated_at")
	case dashboardtypes.DSLKeyCreatedBy:
		return b.StringOperation(b.SelectBuilder(), ctx, operation, "dashboard.created_by", string(key))
	case dashboardtypes.DSLKeyLocked:
		return b.BoolComparison(ctx, operation, "dashboard.locked")
	}
	b.AddError("no handler for reserved key %q", key)
	return ""
}

func (dashboardFieldResolver) tagComparison(b *sqlcompiler.Builder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, tagKey string) string {
	subqueryBuilder := sqlbuilder.NewSelectBuilder()

	if operation == qbtypesv5.FilterOperatorExists || operation == qbtypesv5.FilterOperatorNotExists {
		buildSubqueryForTagKey(subqueryBuilder, tagKey)
	} else {
		// Value predicates take the positive operator; negation toggles the EXISTS wrapper.
		positiveOperation := operation
		if operation.IsNegativeOperator() {
			positiveOperation = operation.Inverse()
		}
		valuePredicate := b.StringOperation(subqueryBuilder, ctx, positiveOperation, "t.value", tagKey)
		if valuePredicate == "" {
			return ""
		}
		buildSubqueryForTagKeyAndValue(subqueryBuilder, tagKey, valuePredicate)
	}

	if operation.IsNegativeOperator() {
		return b.SelectBuilder().NotExists(subqueryBuilder)
	}
	return b.SelectBuilder().Exists(subqueryBuilder)
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
func (dashboardFieldResolver) FreeText(b *sqlcompiler.Builder, value string) string {
	nameColumn := string(b.Formatter().JSONExtractString("dashboard.data", "$.spec.display.name"))
	descriptionColumn := string(b.Formatter().JSONExtractString("dashboard.data", "$.spec.display.description"))
	namePredicate := b.FreeTextContains(b.SelectBuilder(), nameColumn, value)
	descriptionPredicate := b.FreeTextContains(b.SelectBuilder(), descriptionColumn, value)

	subqueryBuilder := sqlbuilder.NewSelectBuilder()
	keyPredicate := b.FreeTextContains(subqueryBuilder, "t.key", value)
	valuePredicate := b.FreeTextContains(subqueryBuilder, "t.value", value)
	buildSubqueryForFreeTextTag(subqueryBuilder, keyPredicate, valuePredicate)
	tagPredicate := b.SelectBuilder().Exists(subqueryBuilder)

	return b.SelectBuilder().Or(namePredicate, descriptionPredicate, tagPredicate)
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
