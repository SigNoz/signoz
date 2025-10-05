package ctxtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type AuthType struct {
	valuer.String
}

var (
	AuthTypeJWT      = AuthType{valuer.NewString("jwt")}
	AuthTypeOpaque   = AuthType{valuer.NewString("opaque")}
	AuthTypeAPIKey   = AuthType{valuer.NewString("api_key")}
	AuthTypeInternal = AuthType{valuer.NewString("internal")}
)
