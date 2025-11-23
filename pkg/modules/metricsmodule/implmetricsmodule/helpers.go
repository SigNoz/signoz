package implmetricsmodule

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// helper struct just for the implementation way we chose
type orderConfig struct {
	sqlColumn      string
	direction      string
	orderBySamples bool
}

func resolveOrderBy(order *qbtypes.OrderBy) (orderConfig, error) {
	// default orderBy
	cfg := orderConfig{
		sqlColumn:      metrictypes.OrderByTimeSeries.StringValue(),
		direction:      strings.ToUpper(qbtypes.OrderDirectionDesc.StringValue()),
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	// Extract column name from OrderByKey (which wraps TelemetryFieldKey)
	columnName := strings.ToLower(order.Key.Name)

	switch columnName {
	case metrictypes.OrderByTimeSeries.StringValue():
		cfg.sqlColumn = metrictypes.OrderByTimeSeries.StringValue()
	case metrictypes.OrderBySamples.StringValue():
		cfg.orderBySamples = true
		cfg.sqlColumn = metrictypes.OrderByTimeSeries.StringValue() // defer true ordering until samples computed
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", columnName)
	}

	// Extract direction from OrderDirection and convert to SQL format (uppercase)
	direction := strings.ToUpper(order.Direction.StringValue())
	// Validate direction using OrderDirectionMap
	if _, ok := qbtypes.OrderDirectionMap[strings.ToLower(direction)]; !ok {
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q, should be one of %s, %s", direction, qbtypes.OrderDirectionAsc, qbtypes.OrderDirectionDesc)
	}
	cfg.direction = direction

	return cfg, nil
}
