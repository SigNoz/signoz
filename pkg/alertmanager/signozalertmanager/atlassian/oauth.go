// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const oauthStateTTL = 10 * time.Minute

// OAuthHandler serves the Atlassian OAuth 2.0 (3LO) flow and connection CRUD for
// the Jira alert channel.
type OAuthHandler struct {
	am alertmanager.Alertmanager
}

// NewOAuthHandler returns an OAuthHandler.
func NewOAuthHandler(am alertmanager.Alertmanager) *OAuthHandler {
	return &OAuthHandler{am: am}
}

// oauthStateEntry is the server-side state for one in-flight OAuth handshake.
type oauthStateEntry struct {
	expiry       time.Time
	openerOrigin string
	orgID        string
}

var oauthStates = &sync.Map{}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "failed to generate secure token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func storeOAuthState(entry oauthStateEntry) (string, error) {
	state, err := randomToken()
	if err != nil {
		return "", err
	}
	oauthStates.Store(state, entry)
	return state, nil
}

func loadAndDeleteOAuthState(state string) (oauthStateEntry, bool) {
	value, exists := oauthStates.LoadAndDelete(state)
	if !exists {
		return oauthStateEntry{}, false
	}
	entry, ok := value.(oauthStateEntry)
	if !ok {
		return oauthStateEntry{}, false
	}
	return entry, true
}

// allowedOpenerOrigin returns openerOrigin when it matches the configured
// redirect URI's origin or any configured allowed opener origin.
func allowedOpenerOrigin(oauth alertmanager.AtlassianOAuthConfig, openerOrigin string) string {
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

// writeBridge renders the minimal OAuth popup bridge page that postMessages the
// result to the opener window and closes itself.
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
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Jira</title></head>
<body>
<p>You can close this window.</p>
%s
</body>
</html>`, script)

	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	rw.WriteHeader(http.StatusOK)
	_, _ = rw.Write([]byte(html))
}

func (h *OAuthHandler) bridgeError(rw http.ResponseWriter, openerOrigin, code string) {
	writeBridge(rw, openerOrigin, map[string]string{"type": "jira_oauth_error", "error": code})
}

type authorizeURLResponse struct {
	AuthorizeURL string `json:"authorize_url"`
}

// OAuthSession starts the Atlassian OAuth flow and returns the consent URL.
func (h *OAuthHandler) OAuthSession(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	oauth := h.am.JiraOAuthConfig()
	if !oauth.Enabled() {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "Jira OAuth is not configured"))
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

	authURL := fmt.Sprintf(
		"https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=%s&scope=%s&redirect_uri=%s&state=%s&response_type=code&prompt=consent",
		url.QueryEscape(oauth.ClientID),
		url.QueryEscape(strings.Join(Scopes, " ")),
		url.QueryEscape(oauth.RedirectURI),
		url.QueryEscape(state),
	)

	render.Success(rw, http.StatusOK, authorizeURLResponse{AuthorizeURL: authURL})
}

// OAuthCallback completes the Atlassian OAuth flow for a Jira connection.
func (h *OAuthHandler) OAuthCallback(rw http.ResponseWriter, req *http.Request) {
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

	oauth := h.am.JiraOAuthConfig()
	if !oauth.Enabled() {
		h.bridgeError(rw, openerOrigin, "oauth_not_configured")
		return
	}

	tokens, err := ExchangeCodeForTokens(ctx, oauth, code)
	if err != nil {
		h.bridgeError(rw, openerOrigin, "token_exchange_failed")
		return
	}

	cloudID, siteURL, err := FetchSite(ctx, tokens.AccessToken)
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
		"type":          "jira_oauth_success",
		"connection_id": connectionID,
		"site":          siteURL,
	})
}

// persistConnection upserts the connection for (org, cloud_id): reconnecting the
// same Atlassian site rotates its tokens rather than creating a duplicate.
func (h *OAuthHandler) persistConnection(ctx context.Context, orgID, cloudID, siteURL, accessToken, refreshToken string) (string, error) {
	store := h.am.AtlassianConnectionStore()

	if existing, err := store.GetByOrgAndCloudID(ctx, orgID, cloudID); err == nil && existing != nil {
		existing.SiteURL = siteURL
		existing.AccessToken = accessToken
		existing.RefreshToken = refreshToken
		existing.UpdatedAt = time.Now()
		if err := store.Update(ctx, existing); err != nil {
			return "", err
		}
		return existing.ID.StringValue(), nil
	}

	conn := alertmanagertypes.NewAtlassianConnection(orgID, cloudID, siteURL, accessToken, refreshToken)
	if err := store.Create(ctx, conn); err != nil {
		return "", err
	}
	return conn.ID.StringValue(), nil
}

// ListConnections returns the org's reusable Atlassian connections.
func (h *OAuthHandler) ListConnections(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	conns, err := h.am.AtlassianConnectionStore().ListByOrg(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	if conns == nil {
		conns = make([]*alertmanagertypes.AtlassianConnection, 0)
	}

	render.Success(rw, http.StatusOK, conns)
}

// DeleteConnection removes a connection, rejecting the request if any channel
// still targets the connection's Atlassian site.
func (h *OAuthHandler) DeleteConnection(rw http.ResponseWriter, req *http.Request) {
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
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, alertmanagertypes.ErrCodeAtlassianConnectionInUse, "this connection is used by one or more Jira alert channels; remove them first"))
		return
	}

	if err := h.am.AtlassianConnectionStore().DeleteByID(ctx, claims.OrgID, id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// ResolveConnections validates that each Jira config references a connection the
// org owns and stamps the runtime-only OrgID so the notifier can resolve live
// credentials at fire/test time. Run on create/update/test.
func (h *OAuthHandler) ResolveConnections(ctx context.Context, orgID string, receiver *alertmanagertypes.Receiver) error {
	store := h.am.AtlassianConnectionStore()

	for _, cfg := range receiver.JiraConfigs {
		if cfg.ConnectionID == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "Jira channel is not connected; please select a connection before saving or testing")
		}

		id, err := valuer.NewUUID(cfg.ConnectionID)
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "Jira connection_id is not a valid uuid-v7")
		}

		if _, err := store.GetByID(ctx, orgID, id); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "Jira connection has expired or is invalid; please reconnect")
		}

		cfg.OrgID = orgID
	}

	return nil
}

// connectionInUse reports whether any Jira channel in the org references connectionID.
func (h *OAuthHandler) connectionInUse(ctx context.Context, orgID, connectionID string) (bool, error) {
	channels, err := h.am.ListChannels(ctx, orgID)
	if err != nil {
		return false, err
	}
	for _, channel := range channels {
		receiver, err := alertmanagertypes.NewReceiver(channel.Data)
		if err != nil {
			return false, errors.NewInternalf(errors.CodeInternal, "failed to parse channel %q while checking connection usage: %v", channel.Name, err)
		}
		for _, cfg := range receiver.JiraConfigs {
			if cfg.ConnectionID == connectionID {
				return true, nil
			}
		}
	}
	return false, nil
}
