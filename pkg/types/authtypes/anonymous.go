package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AnonymousUser                = valuer.UUID{}
	AnonymousUserRoleName        = "signoz-anonymous"
	AnonymousUserRoleDescription = "Role assigned to anonymous users for access to public resources."
)
