package model

import (
	"fmt"
	"context"
	"net/url"
	"golang.org/x/oauth2"
	"github.com/coreos/go-oidc/v3/oidc"
	"go.signoz.io/signoz/ee/query-service/sso"
)

// SamlConfig contans SAML params to generate and respond to the requests 
// from SAML provider
type SamlConfig struct {
	SamlEntity string `json:"samlEntity"`
	SamlIdp    string `json:"samlIdp"`
	SamlCert   string `json:"samlCert"`
}

// GoogleOauthConfig contains a generic config to support oauth 
type GoogleOAuthConfig struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RedirectURI  string `json:"redirectURI"`
}


const (
	googleIssuerURL = "https://accounts.google.com"
)

func (g *GoogleOAuthConfig) GetProvider(domain string, siteUrl *url.URL) (sso.OAuthCallbackProvider, error) {

	ctx, cancel := context.WithCancel(context.Background())

	provider, err := oidc.NewProvider(ctx, googleIssuerURL)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to get provider: %v", err)
	}

	// default to email and profile scope as we just use google auth
	// to verify identity and start a session. 
	scopes := []string{"email"}

	// this is the url google will call after login completion
	redirectURL := fmt.Sprintf("%s://%s/%s",
		siteUrl.Scheme,
		siteUrl.Host,
		"api/v1/complete/google")

	return &sso.GoogleOAuthProvider{
		RedirectURI: g.RedirectURI,
		OAuth2Config: &oauth2.Config{
			ClientID:     g.ClientID,
			ClientSecret: g.ClientSecret,
			Endpoint:     provider.Endpoint(),
			Scopes:       scopes,
			RedirectURL:  redirectURL,
		},
		Verifier: provider.Verifier(
			&oidc.Config{ClientID: g.ClientID},
		),
		Cancel:                         cancel,
		HostedDomain:                  domain,
	}, nil
}

