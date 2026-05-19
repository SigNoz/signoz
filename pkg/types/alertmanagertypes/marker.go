package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/client_golang/prometheus"
)

func NewMarker(r prometheus.Registerer) *types.MemMarker {
	return types.NewMarker(r)
}
