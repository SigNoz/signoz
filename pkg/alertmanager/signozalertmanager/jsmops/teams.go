// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jsmopsnotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jsmops"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager/atlassian"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler struct {
	alertmanager alertmanager.Alertmanager
	discovery    *DiscoveryService
}

func NewHandler(am alertmanager.Alertmanager) *Handler {
	return &Handler{
		alertmanager: am,
		discovery:    NewDiscoveryService(am.AtlassianConnectionStore(), am.AtlassianOAuthConfig(), slog.Default()),
	}
}

type DiscoveryService struct {
	store  alertmanagertypes.AtlassianConnectionStore
	oauth  alertmanager.AtlassianOAuthConfig
	logger *slog.Logger
}

func NewDiscoveryService(store alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, logger *slog.Logger) *DiscoveryService {
	return &DiscoveryService{store: store, oauth: oauth, logger: logger}
}

// Teams lists the teams visible to a connection.
func (d *DiscoveryService) Teams(ctx context.Context, orgID, connectionID string) ([]jsmopsnotify.Team, error) {
	conn, err := atlassian.Resolve(ctx, d.store, orgID, connectionID)
	if err != nil {
		return nil, err
	}

	teams, err := jsmopsnotify.ListTeams(ctx, conn.AccessToken, conn.CloudID)
	if !errors.Is(err, jsmopsnotify.ErrTokenExpired) || conn.RefreshToken == "" {
		return teams, err
	}

	conn, err = atlassian.RefreshAndPersist(ctx, d.store, d.oauth, conn, d.logger)
	if err != nil {
		return nil, err
	}

	return jsmopsnotify.ListTeams(ctx, conn.AccessToken, conn.CloudID)
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

	var teams []jsmopsnotify.Team
	switch {
	case connectionID != "":
		teams, err = h.discovery.Teams(ctx, claims.OrgID, connectionID)
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

// teamsForChannel lists teams using the connection referenced by a saved channel.
func (h *Handler) teamsForChannel(ctx context.Context, orgID, channelID string) ([]jsmopsnotify.Team, error) {
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

	return h.discovery.Teams(ctx, orgID, receiver.JsmOpsConfigs[0].ConnectionID)
}
