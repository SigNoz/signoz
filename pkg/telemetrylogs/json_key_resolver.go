package telemetrylogs

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// JSONKeyResolver creates a JsonKeyToFieldFunc that uses the JSON field resolver
func JSONKeyResolver(jsonResolver *JSONFieldResolver) qbtypes.JsonKeyToFieldFunc {
	return func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any) (string, any) {
		// Use the context-aware JSON field resolver to build the expression
		expression, err := jsonResolver.BuildJSONFieldExpressionForFilter(ctx, key, operator)
		if err != nil {
			// Return empty string and original value on error (fail fast)
			return "", value
		}
		return expression, value
	}
}
