// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

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
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

// httpClient is used for all outbound Atlassian calls.
var httpClient = &http.Client{Timeout: 30 * time.Second}

type Handler struct {
	alertmanager alertmanager.Alertmanager
}

func NewHandler(am alertmanager.Alertmanager) *Handler {
	return &Handler{alertmanager: am}
}

// writeBridge renders the minimal OAuth bridge page.
func writeBridge(rw http.ResponseWriter, openerOrigin string, message map[string]string) {
	var script string
	if openerOrigin != "" {
		messageJSON, _ := json.Marshal(message)
		targetOriginJSON, _ := json.Marshal(openerOrigin)
		script = fmt.Sprintf(`<script>
(function () {
	try {
		if (window.opener && !window.opener.closed) {
			window.opener.postMessage(%s, %s);
		}
	} catch (e) {}
	window.close();
})();
</script>`, messageJSON, targetOriginJSON)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Jira Service Management</title></head>
<body>
<p>You can close this window.</p>
%s
</body>
</html>`, script)

	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	rw.WriteHeader(http.StatusOK)
	rw.Write([]byte(html)) //nolint:errcheck
}

func (h *Handler) bridgeError(rw http.ResponseWriter, openerOrigin, code string) {
	writeBridge(rw, openerOrigin, map[string]string{"type": "jsmops_oauth_error", "error": code})
}

// allowedOpenerOrigin returns openerOrigin when it matches the configured redirect
// URI's origin or any of the configured allowed opener origins.
func allowedOpenerOrigin(oauth alertmanager.JSMOpsOAuthConfig, openerOrigin string) string {
	if openerOrigin == "" {
		return ""
	}
	opener, err := url.Parse(openerOrigin)
	if err != nil || opener.Scheme == "" || opener.Host == "" || opener.Path != "" {
		return ""
	}

	if redirect, err := url.Parse(oauth.RedirectURI); err == nil && redirect.Scheme != "" && redirect.Host != "" {
		if opener.Scheme == redirect.Scheme && opener.Host == redirect.Host {
			return openerOrigin
		}
	}

	for _, allowed := range oauth.AllowedOpenerOrigins {
		parsed, err := url.Parse(allowed)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			continue
		}
		if opener.Scheme == parsed.Scheme && opener.Host == parsed.Host {
			return openerOrigin
		}
	}

	return ""
}

type authorizeURLResponse struct {
	AuthorizeURL string `json:"authorize_url"`
}

// OAuthSession starts the Atlassian OAuth flow.
func (h *Handler) OAuthSession(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	oauth := h.alertmanager.JSMOpsOAuthConfig()
	if !oauth.Enabled() {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "JSM Ops OAuth is not configured"))
		return
	}

	openerOrigin := allowedOpenerOrigin(oauth, req.URL.Query().Get("opener_origin"))

	state, err := storeOAuthState(oauthStateEntry{
		expiry:       time.Now().Add(oauthStateTTL),
		openerOrigin: openerOrigin,
		orgID:        claims.OrgID,
	})
	if err != nil {
		render.Error(rw, err)
		return
	}

	scopes := strings.Join([]string{
		"read:ops-alert:jira-service-management",
		"write:ops-alert:jira-service-management",
		"read:ops-config:jira-service-management",
		"read:jira-work",
		"read:me",
		"offline_access",
	}, " ")
	authURL := fmt.Sprintf(
		"https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=%s&scope=%s&redirect_uri=%s&state=%s&response_type=code&prompt=consent",
		url.QueryEscape(oauth.ClientID),
		url.QueryEscape(scopes),
		url.QueryEscape(oauth.RedirectURI),
		url.QueryEscape(state),
	)

	render.Success(rw, http.StatusOK, authorizeURLResponse{AuthorizeURL: authURL})
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

// OAuthCallback completes the Atlassian OAuth flow.
func (h *Handler) OAuthCallback(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()
	code := req.URL.Query().Get("code")
	state := req.URL.Query().Get("state")
	errorParam := req.URL.Query().Get("error")

	var openerOrigin, orgID string
	stateValid := false
	if entry, ok := loadAndDeleteOAuthState(state); ok && time.Now().Before(entry.expiry) {
		openerOrigin = entry.openerOrigin
		orgID = entry.orgID
		stateValid = true
	}

	if errorParam != "" {
		h.bridgeError(rw, openerOrigin, errorParam)
		return
	}

	if !stateValid {
		h.bridgeError(rw, openerOrigin, "invalid_state")
		return
	}

	oauth := h.alertmanager.JSMOpsOAuthConfig()
	if !oauth.Enabled() {
		h.bridgeError(rw, openerOrigin, "oauth_not_configured")
		return
	}

	tokens, err := exchangeCodeForTokens(ctx, oauth, code)
	if err != nil {
		h.bridgeError(rw, openerOrigin, "token_exchange_failed")
		return
	}

	cloudID, siteURL, err := fetchSiteForJSM(ctx, tokens.AccessToken)
	if err != nil {
		h.bridgeError(rw, openerOrigin, "site_lookup_failed")
		return
	}

	connectionID, err := h.persistConnection(ctx, orgID, cloudID, siteURL, tokens.AccessToken, tokens.RefreshToken)
	if err != nil {
		h.bridgeError(rw, openerOrigin, "connection_persist_failed")
		return
	}

	writeBridge(rw, openerOrigin, map[string]string{
		"type":          "jsmops_oauth_success",
		"connection_id": connectionID,
		"site":          siteURL,
	})
}

// persistConnection upserts the connection for (org, cloud_id): reconnecting the same
// Atlassian site rotates the tokens on the existing row rather than creating a duplicate.
func (h *Handler) persistConnection(ctx context.Context, orgID, cloudID, siteURL, accessToken, refreshToken string) (string, error) {
	connStore := h.alertmanager.JSMOpsConnectionStore()

	if existing, err := connStore.GetByOrgAndCloudID(ctx, orgID, cloudID); err == nil && existing != nil {
		existing.SiteURL = siteURL
		existing.AccessToken = accessToken
		existing.RefreshToken = refreshToken
		existing.UpdatedAt = time.Now()
		if err := connStore.Update(ctx, existing); err != nil {
			return "", err
		}
		return existing.ID.StringValue(), nil
	}

	conn := alertmanagertypes.NewJsmOpsConnection(orgID, cloudID, siteURL, accessToken, refreshToken)
	if err := connStore.Create(ctx, conn); err != nil {
		return "", err
	}
	return conn.ID.StringValue(), nil
}

// ListConnections returns the org's reusable JSM Ops connections.
func (h *Handler) ListConnections(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	conns, err := h.alertmanager.JSMOpsConnectionStore().ListByOrg(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	if conns == nil {
		conns = make([]*alertmanagertypes.JsmOpsConnection, 0)
	}

	render.Success(rw, http.StatusOK, conns)
}

// DeleteConnection removes a connection, rejecting the request if any channel still references it.
func (h *Handler) DeleteConnection(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	idString, ok := mux.Vars(req)["id"]
	if !ok {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "id is required in path"))
		return
	}
	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	inUse, err := h.connectionInUse(ctx, claims.OrgID, id.StringValue())
	if err != nil {
		render.Error(rw, err)
		return
	}
	if inUse {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, alertmanagertypes.ErrCodeJsmOpsConnectionInUse, "this connection is in use by one or more alert channels; remove them first"))
		return
	}

	if err := h.alertmanager.JSMOpsConnectionStore().DeleteByID(ctx, claims.OrgID, id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// connectionInUse reports whether any channel in the org references connectionID.
func (h *Handler) connectionInUse(ctx context.Context, orgID, connectionID string) (bool, error) {
	channels, err := h.alertmanager.ListChannels(ctx, orgID)
	if err != nil {
		return false, err
	}
	for _, channel := range channels {
		receiver, err := alertmanagertypes.NewReceiver(channel.Data)
		if err != nil {
			return false, errors.NewInternalf(errors.CodeInternal, "failed to parse channel %q while checking JSM Ops connection usage: %v", channel.Name, err)
		}
		for _, cfg := range receiver.JsmOpsConfigs {
			if cfg.ConnectionID == connectionID {
				return true, nil
			}
		}
	}
	return false, nil
}

// Teams lists the JSM Ops teams a user can pick as responders.
func (h *Handler) Teams(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	connectionID := req.URL.Query().Get("connection_id")
	channelID := req.URL.Query().Get("channel_id")

	var teams []Team
	switch {
	case connectionID != "":
		teams, err = h.teamsForConnection(ctx, claims.OrgID, connectionID)
	case channelID != "":
		teams, err = h.teamsForChannel(ctx, claims.OrgID, channelID)
	default:
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "connection_id or channel_id is required"))
		return
	}
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, teams)
}

// teamsForConnection lists teams using a connection's stored OAuth tokens.
func (h *Handler) teamsForConnection(ctx context.Context, orgID, connectionID string) ([]Team, error) {
	id, err := valuer.NewUUID(connectionID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "connection_id is not a valid uuid-v7")
	}

	conn, err := h.alertmanager.JSMOpsConnectionStore().GetByID(ctx, orgID, id)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "JSM Ops connection has expired or is invalid; please reconnect")
	}

	teams, err := fetchTeams(ctx, conn.AccessToken, conn.CloudID)
	if !errors.Is(err, ErrTokenExpired) || conn.RefreshToken == "" {
		return teams, err
	}

	tokens, err := RefreshAccessToken(ctx, h.alertmanager.JSMOpsOAuthConfig(), conn.RefreshToken)
	if err != nil {
		return nil, err
	}
	conn.AccessToken = tokens.AccessToken
	conn.RefreshToken = tokens.RefreshToken
	conn.UpdatedAt = time.Now()
	if err := h.alertmanager.JSMOpsConnectionStore().Update(ctx, conn); err != nil {
		return nil, err
	}

	return fetchTeams(ctx, conn.AccessToken, conn.CloudID)
}

// teamsForChannel lists teams using the connection referenced by a saved channel.
func (h *Handler) teamsForChannel(ctx context.Context, orgID, channelID string) ([]Team, error) {
	id, err := valuer.NewUUID(channelID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "channel_id is not a valid uuid-v7")
	}

	channel, err := h.alertmanager.GetChannelByID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	receiver, err := alertmanagertypes.NewReceiver(channel.Data)
	if err != nil {
		return nil, err
	}
	if len(receiver.JsmOpsConfigs) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "channel is not a JSM Ops channel")
	}

	return h.teamsForConnection(ctx, orgID, receiver.JsmOpsConfigs[0].ConnectionID)
}

// postTokenRequest performs an OAuth token endpoint exchange and parses the response.
func postTokenRequest(ctx context.Context, data url.Values) (*tokenResponse, error) {
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

	var tokens tokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %v", err)
	}

	return &tokens, nil
}

func exchangeCodeForTokens(ctx context.Context, oauth alertmanager.JSMOpsOAuthConfig, code string) (*tokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", oauth.RedirectURI)

	return postTokenRequest(ctx, data)
}

type accessibleResource struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// fetchSiteForJSM returns the cloud ID and URL of the Atlassian site.
func fetchSiteForJSM(ctx context.Context, accessToken string) (cloudID string, siteURL string, err error) {
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

	return "", "", fmt.Errorf("no Atlassian site found among %d accessible resource(s); ensure your account has access to a Jira Service Management site", len(resources))
}

// RefreshAccessToken exchanges a refresh token for a new access token.
func RefreshAccessToken(ctx context.Context, oauth alertmanager.JSMOpsOAuthConfig, refreshToken string) (*tokenResponse, error) {
	if !oauth.Enabled() {
		return nil, fmt.Errorf("JSM Ops OAuth is not configured")
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)
	data.Set("refresh_token", refreshToken)

	return postTokenRequest(ctx, data)
}
