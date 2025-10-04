package signoz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authn/callbackauthn/googlecallbackauthn"
	"github.com/SigNoz/signoz/pkg/authn/passwordauthn/emailpasswordauthn"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func NewAuthNs(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore, licensing licensing.Licensing) (map[authtypes.AuthNProvider]authn.AuthN, error) {
	emailPasswordAuthN := emailpasswordauthn.New(store)

	googleCallbackAuthN, err := googlecallbackauthn.New(ctx, store)
	if err != nil {
		return nil, err
	}

	return map[authtypes.AuthNProvider]authn.AuthN{
		authtypes.AuthNProviderEmailPassword: emailPasswordAuthN,
		authtypes.AuthNProviderGoogleAuth:    googleCallbackAuthN,
	}, nil
}
