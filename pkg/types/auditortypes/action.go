package auditortypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Action represents what was done.
type Action struct{ valuer.String }

var (
	ActionCreate = Action{valuer.NewString("create")}
	ActionUpdate = Action{valuer.NewString("update")}
	ActionDelete = Action{valuer.NewString("delete")}
	ActionLogin  = Action{valuer.NewString("login")}
	ActionLogout = Action{valuer.NewString("logout")}
	ActionLock   = Action{valuer.NewString("lock")}
	ActionUnlock = Action{valuer.NewString("unlock")}
	ActionRevoke = Action{valuer.NewString("revoke")}
)

func (Action) Enum() []any {
	return []any{
		ActionCreate,
		ActionUpdate,
		ActionDelete,
		ActionLogin,
		ActionLogout,
		ActionLock,
		ActionUnlock,
		ActionRevoke,
	}
}

// pastTenseMap maps present-tense action strings to their past-tense form
// used in EventName derivation.
var pastTenseMap = map[string]string{
	"create": "created",
	"update": "updated",
	"delete": "deleted",
	"login":  "login",
	"logout": "logout",
	"lock":   "locked",
	"unlock": "unlocked",
	"revoke": "revoked",
}

// PastTense returns the past-tense form of the action for use in EventName.
// Domain-specific verbs like "login" and "logout" remain unchanged.
func (a Action) PastTense() string {
	if pt, ok := pastTenseMap[a.StringValue()]; ok {
		return pt
	}
	return a.StringValue()
}
