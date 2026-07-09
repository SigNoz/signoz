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
)

// httpClient is used for all outbound Atlassian OAuth/token calls.
var httpClient = &http.Client{Timeout: 30 * time.Second}

// Jira Cloud OAuth 2.0 (3LO) scopes needed to create/transition issues and to
// list projects/metadata for the channel form.
var Scopes = []string{
	"read:jira-work",
	"write:jira-work",
	"read:jira-user",
	"read:me",
	"offline_access",
}

// TokenResponse is the Atlassian OAuth token endpoint response.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

// postTokenRequest performs an Atlassian OAuth token exchange.
func postTokenRequest(ctx context.Context, data url.Values) (*TokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://auth.atlassian.com/oauth/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokens TokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %v", err)
	}
	return &tokens, nil
}

// ExchangeCodeForTokens swaps an authorization code for an access/refresh pair.
func ExchangeCodeForTokens(ctx context.Context, oauth alertmanager.AtlassianOAuthConfig, code string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", oauth.RedirectURI)
	return postTokenRequest(ctx, data)
}

// RefreshAccessToken exchanges a refresh token for a new access/refresh pair.
func RefreshAccessToken(ctx context.Context, oauth alertmanager.AtlassianOAuthConfig, refreshToken string) (*TokenResponse, error) {
	if !oauth.Enabled() {
		return nil, fmt.Errorf("jira OAuth is not configured")
	}
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("refresh_token", refreshToken)
	return postTokenRequest(ctx, data)
}

type accessibleResource struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// FetchSite returns the cloud ID and URL of the Atlassian site the token can access.
func FetchSite(ctx context.Context, accessToken string) (cloudID string, siteURL string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.atlassian.com/oauth/token/accessible-resources", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("accessible-resources returned status %d: %s", resp.StatusCode, string(body))
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
	return "", "", fmt.Errorf("no Atlassian site found among %d accessible resource(s); ensure your account has access to a Jira site", len(resources))
}
