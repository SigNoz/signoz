package passwordauthn

import (
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authn/passwordauthn/signozemailpasswordauthn"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func NewPasswordAuthNs(store authtypes.AuthNStore) map[string]authn.PasswordAuthN {
	return map[string]authn.PasswordAuthN{
		"signoz": signozemailpasswordauthn.New(store),
	}
}
