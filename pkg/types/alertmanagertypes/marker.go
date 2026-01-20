package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/client_golang/prometheus"
)

type MemMarker = types.MemMarker

func NewMarker(r prometheus.Registerer) *MemMarker {
	return types.NewMarker(r)
}
