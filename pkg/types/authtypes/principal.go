package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	PrincipalUser           = Principal{valuer.NewString("user")}
	PrincipalServiceAccount = Principal{valuer.NewString("service_account")}
)

type Principal struct{ valuer.String }
