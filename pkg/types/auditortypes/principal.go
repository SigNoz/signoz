package auditortypes

import "github.com/SigNoz/signoz/pkg/valuer"

// PrincipalType identifies the kind of actor that performed the action.
type PrincipalType struct{ valuer.String }

var (
	PrincipalTypeUser           = PrincipalType{valuer.NewString("user")}
	PrincipalTypeServiceAccount = PrincipalType{valuer.NewString("service_account")}
	PrincipalTypeSystem         = PrincipalType{valuer.NewString("system")}
	PrincipalTypeAnonymous      = PrincipalType{valuer.NewString("anonymous")}
)

func (PrincipalType) Enum() []any {
	return []any{
		PrincipalTypeUser,
		PrincipalTypeServiceAccount,
		PrincipalTypeSystem,
		PrincipalTypeAnonymous,
	}
}
