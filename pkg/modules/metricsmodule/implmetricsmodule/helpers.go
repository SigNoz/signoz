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

// TODO(nikhilmantri0902, srikanthccv): Is this is the best way to do things? What does this function even mean?
func resolveOrderBy(order *metricsmoduletypes.OrderBy) (orderConfig, error) {
	cfg := orderConfig{
		sqlColumn:      OrderByColNameTimeSeries,
		direction:      OrderByDirectionDesc,
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	switch strings.ToLower(order.ColumnName) {
	case OrderByColNameTimeSeries:
		cfg.sqlColumn = OrderByColNameTimeSeries
	case OrderByColNameSamples:
		cfg.orderBySamples = true
		cfg.sqlColumn = OrderByColNameTimeSeries // defer true ordering until samples computed
	case OrderByColNameMetricName: // TODO(nikhilmantri0902, srikanthccv): we should provide ordering by metric_name also in my opinion
		cfg.sqlColumn = OrderByColNameMetricName
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", order.ColumnName)
	}

	if order.Order != "" {
		switch strings.ToUpper(order.Order) {
		case OrderByDirectionAsc:
			cfg.direction = OrderByDirectionAsc
		case OrderByDirectionDesc:
			cfg.direction = OrderByDirectionDesc
		default:
			return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q", order.Order)
		}
	}

	return cfg, nil
}
