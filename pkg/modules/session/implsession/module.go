package implsession

import (
	"context"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	settings   factory.ScopedProviderSettings
	authNs     map[authtypes.AuthNProvider]authn.AuthN
	user       user.Module
	userGetter user.Getter
	authDomain authdomain.Module
	tokenizer  tokenizer.Tokenizer
	orgGetter  organization.Getter
}

func NewModule(providerSettings factory.ProviderSettings, authNs map[authtypes.AuthNProvider]authn.AuthN, user user.Module, userGetter user.Getter, authDomain authdomain.Module, tokenizer tokenizer.Tokenizer, orgGetter organization.Getter) session.Module {
	return &module{
		settings:   factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/session/implsession"),
		authNs:     authNs,
		user:       user,
		userGetter: userGetter,
		authDomain: authDomain,
		tokenizer:  tokenizer,
		orgGetter:  orgGetter,
	}
}

func (module *module) GetSessionContext(ctx context.Context, email valuer.Email, siteURL *url.URL) (*authtypes.SessionContext, error) {
	context := authtypes.NewSessionContext()

	orgs, err := module.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return nil, err
	}

	if len(orgs) == 0 {
		context.Exists = false
		return context, nil
	}

	var orgIDs []valuer.UUID
	for _, org := range orgs {
		orgIDs = append(orgIDs, org.ID)
	}

	users, err := module.userGetter.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
	if err != nil {
		return nil, err
	}

	// Since email is a valuer, we can be sure that it is a valid email and we can split it to get the domain name.
	name := strings.Split(email.String(), "@")[1]

	if len(users) == 0 {
		context.Exists = false

		for _, org := range orgs {
			orgContext, err := module.getOrgSessionContext(ctx, org, name, siteURL)
			if err != nil {
				// For some reason, there was an error in getting the org session context. Instead of failing the context call, we create a PasswordAuthNSupport for the org and add a warning.
				orgContext = authtypes.NewOrgSessionContext(org.ID, org.Name).AddPasswordAuthNSupport(authtypes.AuthNProviderEmailPassword).AddWarning(err)
			}

			context = context.AddOrgContext(orgContext)
		}

		return context, nil
	}

	context.Exists = true
	for _, user := range users {
		idx := slices.IndexFunc(orgs, func(org *types.Organization) bool {
			return org.ID == user.OrgID
		})

		if idx == -1 {
			continue
		}

		org := orgs[idx]
		orgContext, err := module.getOrgSessionContext(ctx, org, name, siteURL)
		if err != nil {
			// For some reason, there was an error in getting the org session context. Instead of failing the context call, we create a PasswordAuthNSupport for the org and add a warning.
			orgContext = authtypes.NewOrgSessionContext(org.ID, org.Name).AddPasswordAuthNSupport(authtypes.AuthNProviderEmailPassword).AddWarning(err)
		}

		context = context.AddOrgContext(orgContext)
	}

	return context, nil
}

func (module *module) DeprecatedCreateSessionByEmailPassword(ctx context.Context, email valuer.Email, password string) (*authtypes.Token, error) {
	users, err := module.userGetter.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, errors.New(errors.TypeUnauthenticated, types.ErrCodeIncorrectPassword, "invalid email or password")
	}

	factorPassword, err := module.userGetter.GetFactorPasswordByUserID(ctx, users[0].ID)
	if err != nil {
		return nil, err
	}

	if !factorPassword.Equals(password) {
		return nil, errors.New(errors.TypeUnauthenticated, types.ErrCodeIncorrectPassword, "invalid email orpassword")
	}

	identity := authtypes.NewIdentity(users[0].ID, users[0].OrgID, users[0].Email, users[0].Role)

	return module.tokenizer.CreateToken(ctx, identity, map[string]string{})
}

func (module *module) CreatePasswordAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, email valuer.Email, password string, orgID valuer.UUID) (*authtypes.Token, error) {
	passwordAuthN, err := getProvider[authn.PasswordAuthN](authNProvider, module.authNs)
	if err != nil {
		return nil, err
	}

	identity, err := passwordAuthN.Authenticate(ctx, email.String(), password, orgID)
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
		module.settings.Logger().ErrorContext(ctx, "failed to handle callback", "error", err, "authn_provider", authNProvider)
		return "", err
	}

	user, err := types.NewUser(callbackIdentity.Name, callbackIdentity.Email, types.RoleViewer, callbackIdentity.OrgID)
	if err != nil {
		return "", err
	}

	user, err = module.user.GetOrCreateUser(ctx, user)
	if err != nil {
		return "", err
	}

	token, err := module.tokenizer.CreateToken(ctx, authtypes.NewIdentity(user.ID, user.OrgID, user.Email, user.Role), map[string]string{})
	if err != nil {
		return "", err
	}

	redirectURL := &url.URL{
		Scheme:   callbackIdentity.State.URL.Scheme,
		Host:     callbackIdentity.State.URL.Host,
		Path:     callbackIdentity.State.URL.Path,
		RawQuery: authtypes.NewURLValuesFromToken(token, module.GetRotationInterval(ctx)).Encode(),
	}

	return redirectURL.String(), nil
}

func (module *module) RotateSession(ctx context.Context, accessToken string, refreshToken string) (*authtypes.Token, error) {
	return module.tokenizer.RotateToken(ctx, accessToken, refreshToken)
}

func (module *module) DeleteSession(ctx context.Context, accessToken string) error {
	return module.tokenizer.DeleteToken(ctx, accessToken)
}

func (module *module) GetRotationInterval(context.Context) time.Duration {
	return module.tokenizer.Config().Rotation.Interval
}

func (module *module) getOrgSessionContext(ctx context.Context, org *types.Organization, name string, siteURL *url.URL) (*authtypes.OrgSessionContext, error) {
	authDomain, err := module.authDomain.GetByNameAndOrgID(ctx, name, org.ID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if authDomain == nil {
		return authtypes.NewOrgSessionContext(org.ID, org.Name).AddPasswordAuthNSupport(authtypes.AuthNProviderEmailPassword), nil
	}

	if !authDomain.AuthDomainConfig().SSOEnabled {
		return authtypes.NewOrgSessionContext(org.ID, org.Name).AddPasswordAuthNSupport(authtypes.AuthNProviderEmailPassword), nil
	}

	provider, err := getProvider[authn.CallbackAuthN](authDomain.AuthDomainConfig().AuthNProvider, module.authNs)
	if err != nil {
		return nil, err
	}

	loginURL, err := provider.LoginURL(ctx, siteURL, authDomain)
	if err != nil {
		return nil, err
	}

	return authtypes.NewOrgSessionContext(org.ID, org.Name).AddCallbackAuthNSupport(authDomain.AuthDomainConfig().AuthNProvider, loginURL), nil
}

func getProvider[T authn.AuthN](authNProvider authtypes.AuthNProvider, authNs map[authtypes.AuthNProvider]authn.AuthN) (T, error) {
	var provider T

	provider, ok := authNs[authNProvider].(T)
	if !ok {
		return provider, errors.New(errors.TypeNotFound, errors.CodeNotFound, "authn provider not found")
	}

	return provider, nil
}
