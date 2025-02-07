package alertmanagertypes

import "github.com/prometheus/alertmanager/cluster"

// State is the type alias for the State type from the alertmanager package.
type State = cluster.State

var (
	// SilenceStateName is the name of the silence state.
	SilenceStateName = StateName{name: "silence"}

	// NFLogStateName is the name of the nflog state.
	NFLogStateName = StateName{name: "nflog"}
)

type StateName struct {
	name string
}

func (s StateName) String() string {
	return s.name
}
