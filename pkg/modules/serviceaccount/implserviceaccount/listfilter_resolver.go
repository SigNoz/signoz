package implserviceaccount

import (
	"strings"

	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/parser/filterquery/sqlcompiler"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
)

type serviceAccountFieldResolver struct{}

func newServiceAccountFieldResolver() sqlcompiler.FieldResolver {
	return serviceAccountFieldResolver{}
}

func (serviceAccountFieldResolver) ResolveComparison(visitor *sqlcompiler.Visitor, rawKey string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	key := serviceaccounttypes.DSLKey(strings.ToLower(rawKey))

	allowedOperations, isReserved := serviceaccounttypes.ReservedOps[key]
	if !isReserved {
		visitor.AddError("unknown key %q", rawKey)
		return ""
	}

	if _, allowed := allowedOperations[operation]; !allowed {
		visitor.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
		return ""
	}

	switch key {
	case serviceaccounttypes.DSLKeyName:
		return visitor.BuildStringOperation(visitor.Sb, ctx, operation, "service_account.name", string(key))
	case serviceaccounttypes.DSLKeyEmail:
		return visitor.BuildStringOperation(visitor.Sb, ctx, operation, "service_account.email", string(key))
	case serviceaccounttypes.DSLKeyStatus:
		return visitor.BuildStringOperation(visitor.Sb, ctx, operation, "service_account.status", string(key))
	case serviceaccounttypes.DSLKeyCreatedAt:
		return visitor.BuildTimestampComparison(ctx, operation, "service_account.created_at")
	case serviceaccounttypes.DSLKeyUpdatedAt:
		return visitor.BuildTimestampComparison(ctx, operation, "service_account.updated_at")
	}

	visitor.AddError("no handler for reserved key %q", key)
	return ""
}

func (serviceAccountFieldResolver) ResolveFreeText(visitor *sqlcompiler.Visitor, value string) string {
	return visitor.Sb.Or(
		visitor.BuildFreeTextContains(visitor.Sb, "service_account.name", value),
		visitor.BuildFreeTextContains(visitor.Sb, "service_account.email", value),
	)
}
