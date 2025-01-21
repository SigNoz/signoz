package alertmanagertypes

import "github.com/prometheus/alertmanager/cluster"

type State = cluster.State

var (
	SilenceStateName = StateName{name: "silence"}
	NFLogStateName   = StateName{name: "nflog"}
)

type StateName struct {
	name string
}

func (s StateName) String() string {
	return s.name
}
