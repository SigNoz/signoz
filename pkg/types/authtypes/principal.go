package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	PrincipalUser           = valuer.NewString("user")
	PrincipalServiceAccount = valuer.NewString("service_account")
)

type Principal struct{ valuer.String }
