// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jsmopsnotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jsmops"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type connectionResolver struct {
	connStore alertmanagertypes.JsmOpsConnectionStore
	oauth     alertmanager.JSMOpsOAuthConfig
	logger    *slog.Logger
}

var _ jsmopsnotify.ConnectionStore = (*connectionResolver)(nil)

// NewConnectionResolver returns a ConnectionStore wired to the jsmops_connection
// table and the configured Atlassian OAuth endpoints.
func NewConnectionResolver(connStore alertmanagertypes.JsmOpsConnectionStore, oauth alertmanager.JSMOpsOAuthConfig, logger *slog.Logger) *connectionResolver {
	return &connectionResolver{connStore: connStore, oauth: oauth, logger: logger}
}

// GetTokens returns the current access token, refresh token, and cloud ID.
func (r *connectionResolver) GetTokens(ctx context.Context, orgID, connectionID string) (string, string, string, error) {
	id, err := valuer.NewUUID(connectionID)
	if err != nil {
		return "", "", "", err
	}
	conn, err := r.connStore.GetByID(ctx, orgID, id)
	if err != nil {
		return "", "", "", err
	}
	return conn.AccessToken, conn.RefreshToken, conn.CloudID, nil
}

// Refresh exchanges staleRefreshToken for a fresh access/refresh pair at Atlassian.
func (r *connectionResolver) Refresh(ctx context.Context, staleRefreshToken string) (string, string, error) {
	tokens, err := RefreshAccessToken(r.oauth, staleRefreshToken)
	if err != nil {
		return "", "", err
	}

	rows, err := r.connStore.UpdateTokensByRefreshToken(ctx, staleRefreshToken, tokens.AccessToken, tokens.RefreshToken)
	if err != nil {
		r.logger.ErrorContext(ctx, "refreshed jsm ops token but failed to persist it", slog.Any("err", err))
	} else if rows == 0 {
		r.logger.WarnContext(ctx, "refreshed jsm ops token but no matching connection was found to persist it")
	}

	return tokens.AccessToken, tokens.RefreshToken, nil
}
