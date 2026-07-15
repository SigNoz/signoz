// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jsmopsnotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jsmops"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager/atlassian"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type connectionResolver struct {
	connStore alertmanagertypes.AtlassianConnectionStore
	oauth     alertmanager.AtlassianOAuthConfig
	logger    *slog.Logger
}

var _ jsmopsnotify.ConnectionResolver = (*connectionResolver)(nil)

// NewConnectionResolver returns a ConnectionResolver wired to the atlassian_connection table and the configured Atlassian OAuth endpoints.
func NewConnectionResolver(connStore alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, logger *slog.Logger) *connectionResolver {
	return &connectionResolver{connStore: connStore, oauth: oauth, logger: logger}
}

// Resolve returns the org's connection with the given connection_id.
func (r *connectionResolver) Resolve(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error) {
	return atlassian.Resolve(ctx, r.connStore, orgID, connectionID)
}

// Refresh rotates the connection's tokens and persists them, returning the updated connection.
func (r *connectionResolver) Refresh(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error) {
	conn, err := r.Resolve(ctx, orgID, connectionID)
	if err != nil {
		return nil, err
	}
	return atlassian.RefreshAndPersist(ctx, r.connStore, r.oauth, conn, r.logger)
}
