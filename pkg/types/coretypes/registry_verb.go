package coretypes

import "github.com/SigNoz/signoz/pkg/valuer"

var Verbs = []Verb{
	VerbCreate,
	VerbRead,
	VerbUpdate,
	VerbDelete,
	VerbList,
	VerbAssignee,
	VerbAttach,
}

var (
	VerbCreate   = Verb{valuer.NewString("create"), "created"}
	VerbRead     = Verb{valuer.NewString("read"), "read"}
	VerbUpdate   = Verb{valuer.NewString("update"), "updated"}
	VerbDelete   = Verb{valuer.NewString("delete"), "deleted"}
	VerbList     = Verb{valuer.NewString("list"), "listed"}
	VerbAssignee = Verb{valuer.NewString("assignee"), "assigned"}
	VerbAttach   = Verb{valuer.NewString("attach"), "attached"}
)
