package sso

import (
	"fmt"
	"errors"
	"context"
	"net/http"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type GoogleOAuthProvider struct {
	RedirectURI                    string
	OAuth2Config                   *oauth2.Config
	Verifier                       *oidc.IDTokenVerifier
	Cancel                         context.CancelFunc
	HostedDomain 				   string
}


func (g *GoogleOAuthProvider) BuildAuthURL(state string) (string, error) {
	var opts []oauth2.AuthCodeOption
	
	// set hosted domain. google supports multiple hosted domains but in our case
	// we have one config per host domain. 
	opts = append(opts, oauth2.SetAuthURLParam("hd", g.HostedDomain))

	return g.OAuth2Config.AuthCodeURL(state, opts...), nil
}

type oauth2Error struct{
	error            string
	errorDescription string
}

func (e *oauth2Error) Error() string {
	if e.errorDescription == "" {
		return e.error
	}
	return e.error + ": " + e.errorDescription
}

func (g *GoogleOAuthProvider) HandleCallback(r *http.Request) (identity *SSOIdentity, err error) {
	q := r.URL.Query()
	if errType := q.Get("error"); errType != "" {
		return identity, &oauth2Error{errType, q.Get("error_description")}
	}

	token, err := g.OAuth2Config.Exchange(r.Context(), q.Get("code"))
	if err != nil {
		return identity, fmt.Errorf("google: failed to get token: %v", err)
	}

	return g.createIdentity(r.Context(), token)
}

	
func (g *GoogleOAuthProvider) createIdentity(ctx context.Context, token *oauth2.Token) (identity *SSOIdentity, err error) {
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return identity, errors.New("google: no id_token in token response")
	}
	idToken, err := g.Verifier.Verify(ctx, rawIDToken)
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

	if claims.HostedDomain != g.HostedDomain {
		return identity, fmt.Errorf("oidc: unexpected hd claim %v", claims.HostedDomain)	
	}

	identity = &SSOIdentity{
		UserID:        idToken.Subject,
		Username:      claims.Username,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		ConnectorData: []byte(token.RefreshToken),
	}

	return identity, nil
}

