package auth

import (
	"context"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"go.signoz.io/signoz/ee/query-service/model"
)

const (
	issuerURL = "https://accounts.google.com"
)

type googleOAuthProvider struct {
	redirectURI                    string
	oauth2Config                   *oauth2.Config
	verifier                       *oidc.IDTokenVerifier
	cancel                         context.CancelFunc
	hostedDomain 				   string
}

func NewGoogleAuthProvider(domain string, c *model.GoogleOAuthConfig) (model.OAuthCallbackProvider, error) {

	ctx, cancel := context.WithCancel(context.Background())

	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to get provider: %v", err)
	}

	// default to email and profile scope as we just use google auth
	// to verify identity and start a session. 
	scopes := ["email", "profiles"]

	return &googleOAuthProvider{
		redirectURI: c.redirectURI,
		oauth2Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: c.ClientSecret,
			Endpoint:     provider.Endpoint(),
			Scopes:       scopes,
			RedirectURL:  c.RedirectURI,
		},
		verifier: provider.Verifier(
			&oidc.Config{ClientID: clientID},
		),
		cancel:                         cancel,
		hostedDomain:                  []string{domain},
	}, nil
}

func (g *googleOAuthProvider) BuildAuthURL(state string) (string, error) {
	var opts []oauth2.AuthCodeOption
	
	// set hosted domain. google supports multiple hosted domains but in our case
	// we have one config per host domain. 
	opts = append(opts, oauth2.SetAuthURLParam("hd", c.hostedDomain))

	return c.oauth2Config.AuthCodeURL(state, opts...), nil
}

type oauth2Error struct {
	error            string
	errorDescription string
}

func (e *oauth2Error) Error() string {
	if e.errorDescription == "" {
		return e.error
	}
	return e.error + ": " + e.errorDescription
}

func (g *googleOAuthProvider) HandleCallback(r *http.Request) (identity modelsso.SSOIdentity, err error) {
	q := r.URL.Query()
	if errType := q.Get("error"); errType != "" {
		return identity, &oauth2Error{errType, q.Get("error_description")}
	}

	token, err := c.oauth2Config.Exchange(r.Context(), q.Get("code"))
	if err != nil {
		return identity, fmt.Errorf("google: failed to get token: %v", err)
	}

	return c.createIdentity(r.Context(), identity, s, token)
}

func (g *googleOAuthProvider) createIdentity(ctx context.Context, identity modelsso.SSOIdentity, token *oauth2.Token) (modelsso.SSOIdentity, error) {
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return identity, errors.New("google: no id_token in token response")
	}
	idToken, err := c.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return identity, fmt.Errorf("google: failed to verify ID Token: %v", err)
	}

	var claims struct {
		Username      string `json:"name"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		HostedDomain  string `json:"hd"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return identity, fmt.Errorf("oidc: failed to decode claims: %v", err)
	}

	if claims.HostedDomain != domain {
		return identity, fmt.Errorf("oidc: unexpected hd claim %v", claims.HostedDomain)	
	}

	identity = modelsso.SSOIdentity{
		UserID:        idToken.Subject,
		Username:      claims.Username,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		ConnectorData: []byte(token.RefreshToken),
		Groups:        groups,
	}

	return identity, nil
}

