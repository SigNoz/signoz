package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type HostStatus struct {
	valuer.String
}

var (
	HostStatusActive   = HostStatus{valuer.NewString("active")}
	HostStatusInactive = HostStatus{valuer.NewString("inactive")}
	HostStatusNone     = HostStatus{valuer.NewString("")}
)

func (HostStatus) Enum() []any {
	return []any{
		HostStatusActive,
		HostStatusInactive,
		HostStatusNone,
	}
}

const HostNameAttrKey = "host.name"

// HostsTableMetricNames drives host presence checks (infra monitoring, empty-state).
var HostsTableMetricNames = []string{
	"system.cpu.time",
	"system.memory.usage",
	"system.cpu.load_average.15m",
	"system.filesystem.usage",
}

const (
	HostsOrderByCPU       = "cpu"
	HostsOrderByMemory    = "memory"
	HostsOrderByWait      = "wait"
	HostsOrderByDiskUsage = "disk_usage"
	HostsOrderByLoad15    = "load15"
)

var HostsValidOrderByKeys = []string{
	HostsOrderByCPU,
	HostsOrderByMemory,
	HostsOrderByWait,
	HostsOrderByDiskUsage,
	HostsOrderByLoad15,
	HostNameAttrKey,
}
