package featuretypes

import "fmt"

// Action is the type of action that can be performed on a storable feature.
// This is not of type valuer.String because we want to use it as a map key.
type Action int

// The set of possible actions in a change.
const (
	_ Action = iota
	ActionInsert
	ActionUpdate
	ActionDelete
)

// String returns the action as a human readable text.
func (a Action) String() string {
	switch a {
	case ActionInsert:
		return "Insert"
	case ActionUpdate:
		return "Update"
	case ActionDelete:
		return "Delete"
	default:
		panic(fmt.Sprintf("unsupported action: %d", a))
	}
}
