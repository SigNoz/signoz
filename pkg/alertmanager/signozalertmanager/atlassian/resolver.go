// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jiranotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jira"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// connectionResolver resolves Atlassian OAuth credentials for the Jira notifier
// from the connection store, matching by org + connection_id, and refreshes
// stale access tokens against the Atlassian token endpoint.
type connectionResolver struct {
	connStore alertmanagertypes.AtlassianConnectionStore
	oauth     alertmanager.AtlassianOAuthConfig
	logger    *slog.Logger
}

var _ jiranotify.ConnectionResolver = (*connectionResolver)(nil)

// NewConnectionResolver returns a jira.ConnectionResolver wired to the
// atlassian_connection table and the configured Atlassian OAuth endpoints.
func NewConnectionResolver(connStore alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, logger *slog.Logger) *connectionResolver {
	return &connectionResolver{connStore: connStore, oauth: oauth, logger: logger}
}

// ResolveByConnectionID returns the access token, refresh token, and cloud id of
// the org's connection with the given connection_id.
func (r *connectionResolver) ResolveByConnectionID(ctx context.Context, orgID, connectionID string) (string, string, string, error) {
	id, err := valuer.NewUUID(connectionID)
	if err != nil {
		return "", "", "", errors.NewInvalidInputf(errors.CodeInvalidInput, "jira connection_id is not a valid uuid-v7")
	}

	conn, err := r.connStore.GetByID(ctx, orgID, id)
	if err != nil {
		return "", "", "", errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAtlassianConnectionNotFound, "Atlassian connection has expired or is invalid; please reconnect")
	}

	return conn.AccessToken, conn.RefreshToken, conn.CloudID, nil
}

// Refresh exchanges staleRefreshToken for a fresh access/refresh pair and
// persists it against the matching connection.
func (r *connectionResolver) Refresh(ctx context.Context, staleRefreshToken string) (string, string, error) {
	tokens, err := RefreshAccessToken(ctx, r.oauth, staleRefreshToken)
	if err != nil {
		return "", "", err
	}

	rows, err := r.connStore.UpdateTokensByRefreshToken(ctx, staleRefreshToken, tokens.AccessToken, tokens.RefreshToken)
	if err != nil {
		r.logger.ErrorContext(ctx, "refreshed jira token but failed to persist it", slog.Any("err", err))
	} else if rows == 0 {
		r.logger.WarnContext(ctx, "refreshed jira token but no matching connection was found to persist it")
	}

	return tokens.AccessToken, tokens.RefreshToken, nil
}
