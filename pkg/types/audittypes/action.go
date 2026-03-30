package audittypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Action represents what was done.
type Action struct {
	valuer.String
	pastTense string
}

var (
	ActionCreate = Action{valuer.NewString("create"), "created"}
	ActionUpdate = Action{valuer.NewString("update"), "updated"}
	ActionDelete = Action{valuer.NewString("delete"), "deleted"}
)

func (Action) Enum() []any {
	return []any{
		ActionCreate,
		ActionUpdate,
		ActionDelete,
	}
}

// PastTense returns the past-tense form of the action for use in EventName.
func (a Action) PastTense() string {
	return a.pastTense
}
