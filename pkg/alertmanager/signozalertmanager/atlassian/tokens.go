// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

const (
	authorizeURL           = "https://auth.atlassian.com/authorize"
	tokenURL               = "https://auth.atlassian.com/oauth/token"
	accessibleResourcesURL = "https://api.atlassian.com/oauth/token/accessible-resources"
)

var scopes = []string{
	"read:ops-alert:jira-service-management",
	"write:ops-alert:jira-service-management",
	"read:ops-config:jira-service-management",

	"read:jira-work",
	"write:jira-work",
	"read:jira-user",

	"read:me",
	"offline_access",
}

// tokenResponse is the Atlassian OAuth token endpoint response.
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

// authorizeURLFor builds the consent URL the user's browser is sent to.
func authorizeURLFor(clientID, redirectURI, state string) string {
	query := url.Values{}
	query.Set("audience", "api.atlassian.com")
	query.Set("client_id", clientID)
	query.Set("scope", strings.Join(scopes, " "))
	query.Set("redirect_uri", redirectURI)
	query.Set("state", state)
	query.Set("response_type", "code")
	query.Set("prompt", "consent")
	return authorizeURL + "?" + query.Encode()
}

// postTokenRequest performs an Atlassian OAuth token exchange and parses the response.
func postTokenRequest(ctx context.Context, data url.Values) (*tokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokens tokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %v", err)
	}
	if tokens.AccessToken == "" {
		return nil, fmt.Errorf("token response did not contain an access token")
	}

	return &tokens, nil
}

// exchangeCodeForTokens swaps an authorization code for an access/refresh pair.
func exchangeCodeForTokens(ctx context.Context, oauth alertmanager.AtlassianOAuthConfig, code string) (*tokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", oauth.RedirectURI)

	return postTokenRequest(ctx, data)
}

// refreshConnectionTokens exchanges the connection's refresh token for a fresh access/refresh pair.
func refreshConnectionTokens(ctx context.Context, oauth alertmanager.AtlassianOAuthConfig, conn *alertmanagertypes.AtlassianConnection) (*tokenResponse, error) {
	if !oauth.Enabled() {
		return nil, fmt.Errorf("Atlassian OAuth is not configured")
	}
	if conn.RefreshToken == "" {
		return nil, fmt.Errorf("connection has no refresh token; reconnect the integration")
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("refresh_token", conn.RefreshToken)

	return postTokenRequest(ctx, data)
}

type accessibleResource struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// fetchSite returns the cloud ID and URL of the Atlassian site the token can access.
func fetchSite(ctx context.Context, accessToken string) (cloudID string, siteURL string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, accessibleResourcesURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close() //nolint:errcheck

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("accessible-resources request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var resources []accessibleResource
	if err := json.Unmarshal(body, &resources); err != nil {
		return "", "", fmt.Errorf("failed to parse accessible-resources response: %v", err)
	}

	for _, r := range resources {
		if parsed, parseErr := url.Parse(r.URL); parseErr == nil && strings.HasSuffix(parsed.Hostname(), ".atlassian.net") {
			return r.ID, r.URL, nil
		}
	}

	return "", "", fmt.Errorf("no Atlassian site found among %d accessible resource(s); ensure your account has access to an Atlassian site", len(resources))
}
