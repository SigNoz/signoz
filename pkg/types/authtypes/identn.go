package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	IdentNProviderTokenizer = IdentNProvider{valuer.NewString("tokenizer")}
	IdentNProviderAPIkey    = IdentNProvider{valuer.NewString("api_key")}
	IdentNProviderAnonymous = IdentNProvider{valuer.NewString("anonymous")}
)

type IdentNProvider struct{ valuer.String }
