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
}
