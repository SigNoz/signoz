package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AnonymousUser                = valuer.UUID{}
	AnonymousUserRoleName        = "anonymous-access"
	AnonymousUserRoleDescription = "Anonymous Role for public access objects"
)
