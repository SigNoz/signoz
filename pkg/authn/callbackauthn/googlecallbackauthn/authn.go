package googlecallbackauthn

import (
	"context"
	"net/url"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

const (
	issuerURL    string = "https://accounts.google.com"
	redirectPath string = "/api/v1/complete/google"
)

var (
	scopes []string = []string{"email"}
)

var _ authn.CallbackAuthN = (*AuthN)(nil)

type AuthN struct {
	oidcProvider *oidc.Provider
	store        authtypes.AuthNStore
}

func New(ctx context.Context, store authtypes.AuthNStore) (*AuthN, error) {
	oidcProvider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, err
	}

	return &AuthN{
		oidcProvider: oidcProvider,
		store:        store,
	}, nil
}

func (a *AuthN) LoginURL(ctx context.Context, siteURL *url.URL, authDomain *authtypes.AuthDomain) (string, error) {
	if authDomain.AuthDomainConfig().AuthNProvider != authtypes.AuthNProviderGoogle {
		return "", errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthDomainMismatch, "domain type is not google")
	}

	oauth2Config := a.oauth2Config(siteURL, authDomain)

	return oauth2Config.AuthCodeURL(
		authtypes.NewState(siteURL, authDomain.StorableAuthDomain().ID).URL.String(),
		oauth2.SetAuthURLParam("hd", authDomain.StorableAuthDomain().Name),
	), nil
}

func (a *AuthN) HandleCallback(ctx context.Context, query url.Values) (*authtypes.CallbackIdentity, error) {
	// Check for error from google
	if err := query.Get("error"); err != "" {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "error while authenticating with google").WithAdditional(query.Get("error_description"))
	}

	// Retrieve state from google
	state, err := authtypes.NewStateFromString(query.Get("state"))
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to parse state from google").WithAdditional(err.Error())
	}

	// Retrieve org domain from id. After this stage, we have the organization of the user.
	authDomain, err := a.store.GetAuthDomainFromID(ctx, state.DomainID)
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get org domain from id").WithAdditional(err.Error())
	}

	// Prepare oauth2 config and exchange code for token.
	oauth2Config := a.oauth2Config(state.URL, authDomain)

	token, err := oauth2Config.Exchange(ctx, query.Get("code"))
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get token").WithAdditional(err.Error())
	}

	// Retrieve id token from token response.
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "google: no id_token in token response")
	}

	// Verify id token.
	verifier := a.oidcProvider.Verifier(&oidc.Config{
		ClientID: authDomain.AuthDomainConfig().Google.ClientID,
	})

	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "google: failed to verify ID Token").WithAdditional(err.Error())
	}

	// Retrieve claims from id token.
	var claims struct {
		Name          string `json:"name"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		HostedDomain  string `json:"hd"`
	}

	// Decode claims from id token.
	if err := idToken.Claims(&claims); err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: failed to decode claims: %v", err)
	}

	// Check if hosted domain is the same as the org domain.
	if claims.HostedDomain != authDomain.StorableAuthDomain().Name {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: unexpected hd claim %v", claims.HostedDomain)
	}

	email, err := valuer.NewEmail(claims.Email)
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: failed to parse email: %v", err)
	}

	return &authtypes.CallbackIdentity{
		Name:  claims.Name,
		Email: email,
		OrgID: authDomain.StorableAuthDomain().OrgID,
	}, nil

}

func (a *AuthN) oauth2Config(siteURL *url.URL, authDomain *authtypes.AuthDomain) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     authDomain.AuthDomainConfig().Google.ClientID,
		ClientSecret: authDomain.AuthDomainConfig().Google.ClientSecret,
		Endpoint:     a.oidcProvider.Endpoint(),
		Scopes:       scopes,
		RedirectURL: (&url.URL{
			Scheme: siteURL.Scheme,
			Host:   siteURL.Host,
			Path:   redirectPath,
		}).String(),
	}
}
