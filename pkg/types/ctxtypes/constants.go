package ctxtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type AuthType struct {
	valuer.String
}

var (
	AuthTypeTokenizer = AuthType{valuer.NewString("tokenizer")}
	AuthTypeAPIKey    = AuthType{valuer.NewString("api_key")}
	AuthTypeInternal  = AuthType{valuer.NewString("internal")}
)
