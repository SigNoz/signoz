package impluser

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/ee/query-service/constants"
	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/user"
	baseimpl "github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

// EnterpriseModule embeds the base module implementation
type Module struct {
	*baseimpl.Module // Embed the base module implementation
	store            types.UserStore
}

func NewModule(store types.UserStore) user.Module {
	baseModule := baseimpl.NewModule(store).(*baseimpl.Module)
	return &Module{
		Module: baseModule,
		store:  store,
	}
}

func (m *Module) createUserForSAMLRequest(ctx context.Context, email string) (*types.User, error) {
	// get auth domain from email domain
	_, apierr := m.GetAuthDomainByEmail(ctx, email)
	if apierr != nil {
		zap.L().Error("failed to get domain from email", zap.Error(apierr))
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to get domain from email")
	}

	// get name from email
	parts := strings.Split(email, "@")
	if len(parts) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}
	name := parts[0]

	user, err := types.NewUser(name, email, types.RoleViewer.String(), "orgId from domain")
	if err != nil {
		return nil, err
	}

	err = m.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	// password is not required for SSO login

	return user, nil
}

func (m *Module) PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (string, error) {
	users, err := m.GetUsersByEmail(ctx, email)
	if err != nil {
		zap.L().Error("failed to get user with email received from auth provider", zap.String("error", err.Error()))
		return "", err
	}
	userPayload := users[0]

	user := &types.User{}

	if userPayload == nil {
		newUser, err := m.createUserForSAMLRequest(ctx, email)
		user = newUser
		if err != nil {
			zap.L().Error("failed to create user with email received from auth provider", zap.Error(err))
			return "", err
		}
	} else {
		user = userPayload
	}

	tokenStore, err := m.GetJWTForUser(ctx, user)
	if err != nil {
		zap.L().Error("failed to generate token for SSO login user", zap.Error(err))
		return "", err
	}

	return fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		user.ID,
		tokenStore.RefreshJwt), nil
}

func (m *Module) CanUsePassword(ctx context.Context, email string) (bool, error) {
	domain, err := m.GetAuthDomainByEmail(ctx, email)
	if err != nil {
		return false, err
	}

	if domain != nil && domain.SsoEnabled {
		// sso is enabled, check if the user has admin role
		users, err := m.GetUsersByEmail(ctx, email)
		if err != nil {
			return false, model.BadRequest(fmt.Errorf("failed to get user by email"))
		}
		userPayload := users[0]

		if userPayload == nil {
			return false, model.BadRequest(fmt.Errorf("auth method not supported"))
		}

		if userPayload.Role != types.RoleAdmin.String() {
			return false, model.BadRequest(fmt.Errorf("auth method not supported"))
		}

	}

	return true, nil
}

func (m *Module) LoginPrecheck(ctx context.Context, orgID, email, sourceUrl string) (*types.GettableLoginPrecheck, error) {
	resp := &types.GettableLoginPrecheck{IsUser: true, CanSelfRegister: false}

	// check if email is a valid user
	users, err := m.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		resp.IsUser = false
		return resp, err
	}

	// give them an option to select an org
	if orgID == "" && len(users) > 1 {
		resp.SelectOrg = true
		resp.Orgs = make([]string, len(users))
		for i, user := range users {
			resp.Orgs[i] = user.OrgID
		}
		return resp, nil
	}

	// user := users[0]
	// select the user with the corresponding orgID
	if len(users) > 1 {
		found := false
		for _, tuser := range users {
			if tuser.OrgID == orgID {
				// user = tuser
				found = true
				break
			}
		}
		if !found {
			resp.IsUser = false
			return resp, nil
		}
	}

	// the EE handler wrapper passes the feature flag value in context
	ssoAvailable, ok := ctx.Value("ssoAvailable").(bool)
	if !ok {
		zap.L().Error("failed to retrieve ssoAvailable from context")
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to retrieve SSO availability")
	}

	if ssoAvailable {
		// TODO(Nitya): in multitenancy this should use orgId as well.
		orgDomain, err := m.GetAuthDomainByEmail(ctx, email)
		if err != nil {
			zap.L().Error("failed to get org domain from email", zap.String("email", email), zap.Error(err))
			return nil, err
		}

		if orgDomain != nil && orgDomain.SsoEnabled {
			// saml is enabled for this domain, lets prepare sso url

			if sourceUrl == "" {
				sourceUrl = constants.GetDefaultSiteURL()
			}

			// parse source url that generated the login request
			var err error
			escapedUrl, _ := url.QueryUnescape(sourceUrl)
			siteUrl, err := url.Parse(escapedUrl)
			if err != nil {
				zap.L().Error("failed to parse referer", zap.Error(err))
				return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse referer")
			}

			// build Idp URL that will authenticat the user
			// the front-end will redirect user to this url
			resp.SSOUrl, err = orgDomain.BuildSsoUrl(siteUrl)
			if err != nil {
				zap.L().Error("failed to prepare saml request for domain", zap.String("domain", orgDomain.Name), zap.Error(err))
				return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to prepare saml request for domain")
			}

			// set SSO to true, as the url is generated correctly
			resp.SSO = true
		}
	}
	return resp, nil
}

func (m *Module) GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error) {

	if email == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}

	domain, err := m.store.GetDomainByName(ctx, components[1])
	if err != nil {
		return nil, err
	}
	if domain == nil {
		return nil, nil
	}

	gettableDomain := &types.GettableOrgDomain{StorableOrgDomain: *domain}
	if err := gettableDomain.LoadConfig(domain.Data); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to load domain config")
	}
	return gettableDomain, nil
}
