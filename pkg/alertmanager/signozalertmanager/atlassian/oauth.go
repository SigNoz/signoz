// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

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

	statusText := "You can close this window and return to SigNoz."
	if openerOrigin == "" {
		switch message["type"] {
		case "atlassian_oauth_success":
			statusText = "Atlassian connected successfully. You can close this window and return to SigNoz."
		case "atlassian_oauth_error":
			statusText = "Could not complete the Atlassian connection. You can close this window and try again in SigNoz."
		}
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Atlassian</title></head>
<body>
<p>%s</p>
%s
</body>
</html>`, statusText, script)

	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	rw.WriteHeader(http.StatusOK)
	rw.Write([]byte(html)) //nolint:errcheck
}

func (h *Handler) bridgeError(rw http.ResponseWriter, openerOrigin, code string) {
	writeBridge(rw, openerOrigin, map[string]string{"type": "atlassian_oauth_error", "error": code})
}

// allowedOpenerOrigin returns openerOrigin if it matches the redirect URI origin or a configured allowed opener origin.
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

type authorizeURLResponse struct {
	AuthorizeURL string `json:"authorize_url"`
}

// OAuthSession starts the Atlassian OAuth flow and returns the consent URL.
func (h *Handler) OAuthSession(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	oauth := h.alertmanager.AtlassianOAuthConfig()
	if !oauth.Enabled() {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "Atlassian OAuth is not configured"))
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

	render.Success(rw, http.StatusOK, authorizeURLResponse{
		AuthorizeURL: authorizeURLFor(oauth.ClientID, oauth.RedirectURI, state),
	})
}

// OAuthCallback completes the Atlassian OAuth flow and persists the connection.
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

	oauth := h.alertmanager.AtlassianOAuthConfig()
	if !oauth.Enabled() {
		h.bridgeError(rw, openerOrigin, "oauth_not_configured")
		return
	}

	tokens, err := exchangeCodeForTokens(ctx, oauth, code)
	if err != nil {
		h.bridgeError(rw, openerOrigin, "token_exchange_failed")
		return
	}

	// The token has to be traded for the cloud id and canonical site URL.
	cloudID, siteURL, err := fetchSite(ctx, tokens.AccessToken)
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
		"type":          "atlassian_oauth_success",
		"connection_id": connectionID,
		"site":          siteURL,
	})
}

// persistConnection upserts the connection for (org, site_url), rotating tokens on reconnect instead of creating duplicates.
func (h *Handler) persistConnection(ctx context.Context, orgID, cloudID, siteURL, accessToken, refreshToken string) (string, error) {
	connStore := h.alertmanager.AtlassianConnectionStore()

	existing, err := connStore.GetByOrgAndSiteURL(ctx, orgID, siteURL)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		// A real lookup error (not "no such row") must not be treated as "does not exist" — that would duplicate the connection below.
		return "", err
	}
	if existing != nil {
		existing.CloudID = cloudID
		existing.AccessToken = accessToken
		existing.RefreshToken = refreshToken
		existing.UpdatedAt = time.Now()
		if err := connStore.Update(ctx, existing); err != nil {
			return "", err
		}
		return existing.ID.StringValue(), nil
	}

	conn := alertmanagertypes.NewAtlassianConnection(orgID, cloudID, siteURL, accessToken, refreshToken)
	if err := connStore.Create(ctx, conn); err != nil {
		return "", err
	}
	return conn.ID.StringValue(), nil
}

// ListConnections returns the org's reusable Atlassian connections.
func (h *Handler) ListConnections(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	conns, err := h.alertmanager.AtlassianConnectionStore().ListByOrg(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	if conns == nil {
		conns = make([]*alertmanagertypes.AtlassianConnection, 0)
	}

	render.Success(rw, http.StatusOK, conns)
}

// DeleteConnection removes a connection.
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
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, alertmanagertypes.ErrCodeAtlassianConnectionInUse, "this connection is in use by one or more alert channels; remove them first"))
		return
	}

	if err := h.alertmanager.AtlassianConnectionStore().DeleteByID(ctx, claims.OrgID, id); err != nil {
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
			return false, errors.NewInternalf(errors.CodeInternal, "failed to parse channel %q while checking Atlassian connection usage: %v", channel.Name, err)
		}
		for _, config := range receiver.AtlassianConfigs() {
			if config.GetConnectionID() == connectionID {
				return true, nil
			}
		}
	}

	return false, nil
}

// ResolveConnections validates Atlassian-backed configs reference org-owned connections and stamps the runtime-only OrgID.
func (h *Handler) ResolveConnections(ctx context.Context, orgID string, receiver *alertmanagertypes.Receiver) error {
	connStore := h.alertmanager.AtlassianConnectionStore()

	for _, config := range receiver.AtlassianConfigs() {
		if config.GetConnectionID() == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "%s channel is not connected; please select a connection before saving or testing", config.ChannelKind())
		}

		if _, err := Resolve(ctx, connStore, orgID, config.GetConnectionID()); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "%s connection has expired or is invalid; please reconnect", config.ChannelKind())
		}

		config.SetOrgID(orgID)
	}

	return nil
}
