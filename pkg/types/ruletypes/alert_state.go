package ruletypes

import "github.com/SigNoz/signoz/pkg/valuer"

type AlertState struct {
	valuer.String
}

var (
	StateInactive   = AlertState{valuer.NewString("inactive")}
	StatePending    = AlertState{valuer.NewString("pending")}
	StateRecovering = AlertState{valuer.NewString("recovering")}
	StateFiring     = AlertState{valuer.NewString("firing")}
	StateNoData     = AlertState{valuer.NewString("nodata")}
	StateDisabled   = AlertState{valuer.NewString("disabled")}
)

func (AlertState) Enum() []any {
	return []any{
		StateInactive,
		StatePending,
		StateRecovering,
		StateFiring,
		StateNoData,
		StateDisabled,
	}
}

var alertStateSeverity = map[AlertState]int{
	StateInactive:   0,
	StatePending:    1,
	StateRecovering: 2,
	StateFiring:     3,
	StateNoData:     4,
	StateDisabled:   5,
}

func (a AlertState) Severity() int {
	return alertStateSeverity[a]
}
