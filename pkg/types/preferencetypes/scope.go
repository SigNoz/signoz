package preferencetypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	ScopeOrg  = Scope{valuer.NewString("org")}
	ScopeUser = Scope{valuer.NewString("user")}
)

type Scope struct{ valuer.String }
