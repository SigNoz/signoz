package implsession

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	authNs     map[authtypes.AuthNProvider]authn.AuthN
	user       user.Module
	userGetter user.Getter
	authDomain authdomain.Module
	tokenizer  tokenizer.Tokenizer
}

func NewModule(authNs map[authtypes.AuthNProvider]authn.AuthN, user user.Module, userGetter user.Getter, authDomain authdomain.Module, tokenizer tokenizer.Tokenizer) session.Module {
	return &module{
		authNs:     authNs,
		user:       user,
		userGetter: userGetter,
		authDomain: authDomain,
		tokenizer:  tokenizer,
	}
}

func (module *module) GetSessionContext(ctx context.Context, email string, siteURL *url.URL) (*authtypes.SessionContext, error) {
	context := authtypes.NewSessionContext()

	users, err := module.userGetter.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		context.IsUser = false
	}

	if len(users) > 1 {
		context.SelectOrg = true
		return context, nil
	}

	// There exists only 1 user with this email, therefore we can perform checks on the organization.
	user := users[0]
	context.OrgID = valuer.MustNewUUID(user.OrgID)

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}

	orgDomain, err := module.authDomain.GetByNameAndOrgID(ctx, components[1], valuer.MustNewUUID(user.OrgID))
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return context, err
		}

		return nil, err
	}

	if !orgDomain.AuthDomainConfig().SSOEnabled {
		return context, nil
	}

	// this is to allow self registration
	context.IsUser = true
	context.SSO = true

	provider, err := getProvider[authn.CallbackAuthN](orgDomain.AuthDomainConfig().AuthNProvider, module.authNs)
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "authn provider not found")
	}

	loginURL, err := provider.LoginURL(ctx, siteURL, orgDomain)
	if err != nil {
		return nil, err
	}

	context.SSOUrl = loginURL
	return context, nil
}

func (module *module) CreatePasswordAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, email string, password string, orgID valuer.UUID) (*authtypes.Token, error) {
	passwordAuthN, err := getProvider[authn.PasswordAuthN](authNProvider, module.authNs)
	if err != nil {
		return nil, err
	}

	identity, err := passwordAuthN.Authenticate(ctx, email, password, orgID)
	if err != nil {
		return nil, err
	}

	return module.tokenizer.CreateToken(ctx, identity, map[string]string{})
}

func (module *module) CreateCallbackAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, values url.Values) (string, error) {
	callbackAuthN, err := getProvider[authn.CallbackAuthN](authNProvider, module.authNs)
	if err != nil {
		return "", err
	}

	callbackIdentity, err := callbackAuthN.HandleCallback(ctx, values)
	if err != nil {
		return "", err
	}

	user, err := types.NewUser(callbackIdentity.Name, callbackIdentity.Email, types.RoleViewer, callbackIdentity.OrgID.String())
	if err != nil {
		return "", err
	}

	user, err = module.user.GetOrCreateUser(ctx, user)
	if err != nil {
		return "", err
	}

	token, err := module.tokenizer.CreateToken(ctx, authtypes.NewIdentity(user.ID, valuer.MustNewUUID(user.OrgID), user.Email, user.Role), map[string]string{})
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s?access_token=%s&refresh_token=%s&user_id=%s", callbackIdentity.State.URL.JoinPath("login").String(), token.AccessToken, token.RefreshToken, user.ID.String()), nil
}

func getProvider[T authn.AuthN](authNProvider authtypes.AuthNProvider, authNs map[authtypes.AuthNProvider]authn.AuthN) (T, error) {
	var provider T

	provider, ok := authNs[authNProvider].(T)
	if !ok {
		return provider, errors.New(errors.TypeNotFound, errors.CodeNotFound, "authn provider not found")
	}

	return provider, nil
}
