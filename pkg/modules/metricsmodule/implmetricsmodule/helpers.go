package implmetricsmodule

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
)

type orderConfig struct {
	sqlColumn      string
	direction      string
	orderBySamples bool
}

func resolveOrderBy(order *metricsmoduletypes.OrderBy) (orderConfig, error) {
	cfg := orderConfig{
		sqlColumn:      orderByColNameTimeSeries,
		direction:      orderByDirectionDesc,
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	switch strings.ToLower(order.ColumnName) {
	case orderByColNameTimeSeries:
		cfg.sqlColumn = orderByColNameTimeSeries
	case orderByColNameSamples:
		cfg.orderBySamples = true
		cfg.sqlColumn = orderByColNameTimeSeries // defer true ordering until samples computed
	case orderByColNameMetricName: // TODO(nikhilmantri0902, srikanthccv): we should provide ordering by metric_name also in my opinion
		cfg.sqlColumn = orderByColNameMetricName
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", order.ColumnName)
	}

	if order.Order != "" {
		switch strings.ToUpper(order.Order) {
		case orderByDirectionAsc:
			cfg.direction = orderByDirectionAsc
		case orderByDirectionDesc:
			cfg.direction = orderByDirectionDesc
		default:
			return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q", order.Order)
		}
	}

	return cfg, nil
}
