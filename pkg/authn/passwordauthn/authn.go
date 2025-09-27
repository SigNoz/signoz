package passwordauthn

import (
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authn/passwordauthn/emailpasswordauthn"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func NewPasswordAuthNs(store authtypes.AuthNStore) map[string]authn.PasswordAuthN {
	return map[string]authn.PasswordAuthN{
		"signoz": emailpasswordauthn.New(store),
	}
}
