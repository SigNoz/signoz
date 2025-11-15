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
		sqlColumn:      "timeseries",
		direction:      "DESC",
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	switch strings.ToLower(order.ColumnName) {
	case "", "timeseries":
		cfg.sqlColumn = "timeseries"
	case "samples":
		cfg.orderBySamples = true
		cfg.sqlColumn = "timeseries" // defer true ordering until samples computed
	case "metricname", "metric_name":
		cfg.sqlColumn = "metric_name"
	case "lastreceived", "last_received":
		cfg.sqlColumn = "lastReceived"
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", order.ColumnName)
	}

	if order.Order != "" {
		switch strings.ToUpper(order.Order) {
		case "ASC":
			cfg.direction = "ASC"
		case "DESC":
			cfg.direction = "DESC"
		default:
			return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q", order.Order)
		}
	}

	return cfg, nil
}
