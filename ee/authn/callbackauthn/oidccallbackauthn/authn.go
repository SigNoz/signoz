package oidccallbackauthn

import (
	"context"
	"net/url"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

const (
	redirectPath string = "/api/v1/complete/oidc"
)

var (
	scopes []string = []string{"email", oidc.ScopeOpenID}
)

var _ authn.CallbackAuthN = (*AuthN)(nil)

type AuthN struct {
	store      authtypes.AuthNStore
	licensing  licensing.Licensing
	httpClient *client.Client
}

func New(store authtypes.AuthNStore, licensing licensing.Licensing, providerSettings factory.ProviderSettings) (*AuthN, error) {
	httpClient, err := client.New(providerSettings.Logger, providerSettings.TracerProvider, providerSettings.MeterProvider)
	if err != nil {
		return nil, err
	}

	return &AuthN{
		store:      store,
		licensing:  licensing,
		httpClient: httpClient,
	}, nil
}

func (a *AuthN) LoginURL(ctx context.Context, siteURL *url.URL, authDomain *authtypes.AuthDomain) (string, error) {
	if authDomain.AuthDomainConfig().AuthNProvider != authtypes.AuthNProviderOIDC {
		return "", errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthDomainMismatch, "domain type is not oidc")
	}

	_, oauth2Config, err := a.oidcProviderAndoauth2Config(ctx, siteURL, authDomain)
	if err != nil {
		return "", err
	}

	return oauth2Config.AuthCodeURL(authtypes.NewState(siteURL, authDomain.StorableAuthDomain().ID).URL.String()), nil
}

func (a *AuthN) HandleCallback(ctx context.Context, query url.Values) (*authtypes.CallbackIdentity, error) {
	if err := query.Get("error"); err != "" {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: error while authenticating").WithAdditional(query.Get("error_description"))
	}

	state, err := authtypes.NewStateFromString(query.Get("state"))
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeInvalidState, "oidc: invalid state").WithAdditional(err.Error())
	}

	authDomain, err := a.store.GetAuthDomainFromID(ctx, state.DomainID)
	if err != nil {
		return nil, err
	}

	_, err = a.licensing.GetActive(ctx, authDomain.StorableAuthDomain().OrgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	oidcProvider, oauth2Config, err := a.oidcProviderAndoauth2Config(ctx, state.URL, authDomain)
	if err != nil {
		return nil, err
	}

	ctx = context.WithValue(ctx, oauth2.HTTPClient, a.httpClient.Client())
	token, err := oauth2Config.Exchange(ctx, query.Get("code"))
	if err != nil {
		var retrieveError *oauth2.RetrieveError
		if errors.As(err, &retrieveError) {
			return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "oidc: failed to get token").WithAdditional(retrieveError.ErrorDescription).WithAdditional(string(retrieveError.Body))
		}

		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: failed to get token").WithAdditional(err.Error())
	}

	claims, err := a.claimsFromIDToken(ctx, authDomain, oidcProvider, token)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if claims == nil && authDomain.AuthDomainConfig().OIDC.GetUserInfo {
		claims, err = a.claimsFromUserInfo(ctx, oidcProvider, token)
		if err != nil {
			return nil, err
		}
	}

	emailClaim, ok := claims[authDomain.AuthDomainConfig().OIDC.ClaimMapping.Email].(string)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "oidc: missing email in claims")
	}

	email, err := valuer.NewEmail(emailClaim)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "oidc: failed to parse email").WithAdditional(err.Error())
	}

	if !authDomain.AuthDomainConfig().OIDC.InsecureSkipEmailVerified {
		emailVerifiedClaim, ok := claims["email_verified"].(bool)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "oidc: missing email_verified in claims")
		}

		if !emailVerifiedClaim {
			return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "oidc: email is not verified")
		}
	}

	return authtypes.NewCallbackIdentity("", email, authDomain.StorableAuthDomain().OrgID, state), nil
}

func (a *AuthN) oidcProviderAndoauth2Config(ctx context.Context, siteURL *url.URL, authDomain *authtypes.AuthDomain) (*oidc.Provider, *oauth2.Config, error) {
	if authDomain.AuthDomainConfig().OIDC.IssuerAlias != "" {
		ctx = oidc.InsecureIssuerURLContext(ctx, authDomain.AuthDomainConfig().OIDC.IssuerAlias)
	}

	oidcProvider, err := oidc.NewProvider(ctx, authDomain.AuthDomainConfig().OIDC.Issuer)
	if err != nil {
		return nil, nil, err
	}

	return oidcProvider, &oauth2.Config{
		ClientID:     authDomain.AuthDomainConfig().OIDC.ClientID,
		ClientSecret: authDomain.AuthDomainConfig().OIDC.ClientSecret,
		Endpoint:     oidcProvider.Endpoint(),
		Scopes:       scopes,
		RedirectURL: (&url.URL{
			Scheme: siteURL.Scheme,
			Host:   siteURL.Host,
			Path:   redirectPath,
		}).String(),
	}, nil
}

func (a *AuthN) claimsFromIDToken(ctx context.Context, authDomain *authtypes.AuthDomain, provider *oidc.Provider, token *oauth2.Token) (map[string]any, error) {
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "oidc: no id_token in token response")
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: authDomain.AuthDomainConfig().OIDC.ClientID})
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "oidc: failed to verify token").WithAdditional(err.Error())
	}

	var claims map[string]any
	if err := idToken.Claims(&claims); err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "oidc: failed to decode claims").WithAdditional(err.Error())
	}

	return claims, nil
}

func (a *AuthN) claimsFromUserInfo(ctx context.Context, provider *oidc.Provider, token *oauth2.Token) (map[string]any, error) {
	var claims map[string]any

	userInfo, err := provider.UserInfo(ctx, oauth2.StaticTokenSource(&oauth2.Token{
		AccessToken: token.AccessToken,
		TokenType:   "Bearer", // The UserInfo endpoint requires a bearer token as per RFC6750
	}))
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "oidc: failed to get user info").WithAdditional(err.Error())
	}

	if err := userInfo.Claims(&claims); err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "oidc: failed to decode claims").WithAdditional(err.Error())
	}

	return claims, nil
}
