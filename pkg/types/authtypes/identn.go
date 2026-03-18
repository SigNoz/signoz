package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	IdentNProviderTokenizer     = IdentNProvider{valuer.NewString("tokenizer")}
	IdentNProviderAPIKey        = IdentNProvider{valuer.NewString("api_key")}
	IdentNProviderAnonymous     = IdentNProvider{valuer.NewString("anonymous")}
	IdentNProviderInternal      = IdentNProvider{valuer.NewString("internal")}
	IdentNProviderImpersonation = IdentNProvider{valuer.NewString("impersonation")}
)

type IdentNProvider struct{ valuer.String }
