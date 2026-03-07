package googlecallbackauthn

import (
	"context"
	"net/url"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	admin "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/option"
)

const (
	issuerURL    string = "https://accounts.google.com"
	redirectPath string = "/api/v1/complete/google"
)

var scopes []string = []string{"email", "profile"}

var _ authn.CallbackAuthN = (*AuthN)(nil)

type AuthN struct {
	store      authtypes.AuthNStore
	settings   factory.ScopedProviderSettings
	httpClient *client.Client
}

func New(ctx context.Context, store authtypes.AuthNStore, providerSettings factory.ProviderSettings) (*AuthN, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/authn/callbackauthn/googlecallbackauthn")

	httpClient, err := client.New(settings.Logger(), providerSettings.TracerProvider, providerSettings.MeterProvider)
	if err != nil {
		return nil, err
	}

	return &AuthN{
		store:      store,
		settings:   settings,
		httpClient: httpClient,
	}, nil
}

func (a *AuthN) LoginURL(ctx context.Context, siteURL *url.URL, authDomain *authtypes.AuthDomain) (string, error) {
	oidcProvider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return "", err
	}

	if authDomain.AuthDomainConfig().AuthNProvider != authtypes.AuthNProviderGoogleAuth {
		return "", errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthDomainMismatch, "domain type is not google")
	}

	oauth2Config := a.oauth2Config(siteURL, authDomain, oidcProvider)

	return oauth2Config.AuthCodeURL(
		authtypes.NewState(siteURL, authDomain.StorableAuthDomain().ID).URL.String(),
		oauth2.SetAuthURLParam("hd", authDomain.StorableAuthDomain().Name),
	), nil
}

func (a *AuthN) HandleCallback(ctx context.Context, query url.Values) (*authtypes.CallbackIdentity, error) {
	oidcProvider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, err
	}

	if err := query.Get("error"); err != "" {
		a.settings.Logger().ErrorContext(ctx, "google: error while authenticating", "error", err, "error_description", query.Get("error_description"))
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "google: error while authenticating").WithAdditional(query.Get("error_description"))
	}

	state, err := authtypes.NewStateFromString(query.Get("state"))
	if err != nil {
		a.settings.Logger().ErrorContext(ctx, "google: invalid state", "error", err)
		return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeInvalidState, "google: invalid state").WithAdditional(err.Error())
	}

	authDomain, err := a.store.GetAuthDomainFromID(ctx, state.DomainID)
	if err != nil {
		return nil, err
	}

	oauth2Config := a.oauth2Config(state.URL, authDomain, oidcProvider)
	token, err := oauth2Config.Exchange(ctx, query.Get("code"))
	if err != nil {
		var retrieveError *oauth2.RetrieveError
		if errors.As(err, &retrieveError) {
			a.settings.Logger().ErrorContext(ctx, "google: failed to get token", "error", err, "error_description", retrieveError.ErrorDescription, "body", string(retrieveError.Body))
			return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: failed to get token").WithAdditional(retrieveError.ErrorDescription)
		}

		a.settings.Logger().ErrorContext(ctx, "google: failed to get token", "error", err)
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "google: failed to get token")
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google: no id_token in token response")
	}

	verifier := oidcProvider.Verifier(&oidc.Config{ClientID: authDomain.AuthDomainConfig().Google.ClientID})
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		a.settings.Logger().ErrorContext(ctx, "google: failed to verify token", "error", err)
		return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: failed to verify token")
	}

	var claims struct {
		Name          string `json:"name"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		HostedDomain  string `json:"hd"`
	}

	if err := idToken.Claims(&claims); err != nil {
		a.settings.Logger().ErrorContext(ctx, "google: missing or invalid claims", "error", err)
		return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: missing or invalid claims").WithAdditional(err.Error())
	}

	if claims.HostedDomain != authDomain.StorableAuthDomain().Name {
		a.settings.Logger().ErrorContext(ctx, "google: unexpected hd claim", "expected", authDomain.StorableAuthDomain().Name, "actual", claims.HostedDomain)
		return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: unexpected hd claim")
	}

	if !authDomain.AuthDomainConfig().Google.InsecureSkipEmailVerified {
		if !claims.EmailVerified {
			a.settings.Logger().ErrorContext(ctx, "google: email is not verified", "email", claims.Email)
			return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: email is not verified")
		}
	}

	email, err := valuer.NewEmail(claims.Email)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "google: failed to parse email").WithAdditional(err.Error())
	}

	var groups []string
	if authDomain.AuthDomainConfig().Google.FetchGroups {
		groups, err = a.fetchGoogleWorkspaceGroups(ctx, claims.Email, authDomain.AuthDomainConfig().Google)
		if err != nil {
			a.settings.Logger().ErrorContext(ctx, "google: could not fetch groups", "error", err)
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "google: could not fetch groups").WithAdditional(err.Error())
		}

		allowedGroups := authDomain.AuthDomainConfig().Google.AllowedGroups
		if len(allowedGroups) > 0 {
			groups = filterGroups(groups, allowedGroups)
			if len(groups) == 0 {
				return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "google: user %q is not in any allowed groups", claims.Email).WithAdditional(allowedGroups...)
			}
		}
	}

	return authtypes.NewCallbackIdentity(claims.Name, email, authDomain.StorableAuthDomain().OrgID, state, groups, ""), nil
}

func (a *AuthN) ProviderInfo(ctx context.Context, authDomain *authtypes.AuthDomain) *authtypes.AuthNProviderInfo {
	return &authtypes.AuthNProviderInfo{
		RelayStatePath: nil,
	}
}

func (a *AuthN) oauth2Config(siteURL *url.URL, authDomain *authtypes.AuthDomain, provider *oidc.Provider) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     authDomain.AuthDomainConfig().Google.ClientID,
		ClientSecret: authDomain.AuthDomainConfig().Google.ClientSecret,
		Endpoint:     provider.Endpoint(),
		Scopes:       scopes,
		RedirectURL: (&url.URL{
			Scheme: siteURL.Scheme,
			Host:   siteURL.Host,
			Path:   redirectPath,
		}).String(),
	}
}

func (a *AuthN) fetchGoogleWorkspaceGroups(ctx context.Context, userEmail string, config *authtypes.GoogleConfig) ([]string, error) {
	adminEmail := config.GetAdminEmailForDomain(userEmail)
	if adminEmail == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no admin email configured for domain of %s", userEmail)
	}

	jwtConfig, err := google.JWTConfigFromJSON([]byte(config.ServiceAccountJSON), admin.AdminDirectoryGroupReadonlyScope)
	if err != nil {
		a.settings.Logger().ErrorContext(ctx, "google: invalid service account credentials", "error", err)
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid service account credentials")
	}

	jwtConfig.Subject = adminEmail

	customCtx := context.WithValue(ctx, oauth2.HTTPClient, a.httpClient.Client())

	adminService, err := admin.NewService(ctx, option.WithHTTPClient(jwtConfig.Client(customCtx)))
	if err != nil {
		a.settings.Logger().ErrorContext(ctx, "google: unable to create directory service", "error", err)
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "unable to create directory service")
	}

	checkedGroups := make(map[string]struct{})

	return a.getGroups(ctx, adminService, userEmail, config.FetchTransitiveGroupMembership, checkedGroups)
}

// Recursive method
func (a *AuthN) getGroups(ctx context.Context, adminService *admin.Service, userEmail string, fetchTransitive bool, checkedGroups map[string]struct{}) ([]string, error) {
	var userGroups []string
	var pageToken string

	for {
		call := adminService.Groups.List().UserKey(userEmail)
		if pageToken != "" {
			call = call.PageToken(pageToken)
		}

		groupList, err := call.Context(ctx).Do()
		if err != nil {
			a.settings.Logger().ErrorContext(ctx, "google: unable to list groups", "error", err)
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "unable to list groups")
		}

		for _, group := range groupList.Groups {
			if _, exists := checkedGroups[group.Email]; exists {
				continue
			}

			checkedGroups[group.Email] = struct{}{}
			userGroups = append(userGroups, group.Email)

			if fetchTransitive {
				transitiveGroups, err := a.getGroups(ctx, adminService, group.Email, fetchTransitive, checkedGroups)
				if err != nil {
					a.settings.Logger().ErrorContext(ctx, "google: unable to list transitive groups", "error", err)
					return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "unable to list transitive groups")
				}
				userGroups = append(userGroups, transitiveGroups...)
			}
		}

		pageToken = groupList.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return userGroups, nil
}

func filterGroups(userGroups, allowedGroups []string) []string {
	allowed := make(map[string]struct{}, len(allowedGroups))
	for _, g := range allowedGroups {
		allowed[g] = struct{}{} // just to make o(1) searches
	}

	var filtered []string
	for _, g := range userGroups {
		if _, ok := allowed[g]; ok {
			filtered = append(filtered, g)
		}
	}

	return filtered
}
