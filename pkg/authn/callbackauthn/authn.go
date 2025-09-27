package callbackauthn

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authn/callbackauthn/googlecallbackauthn"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func NewCallbackAuthNs(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore) (map[string]authn.CallbackAuthN, error) {
	googleCallbackAuthn, err := googlecallbackauthn.New(ctx, store)
	if err != nil {
		return nil, err
	}

	return map[string]authn.CallbackAuthN{
		"google": googleCallbackAuthn,
	}, nil
}
