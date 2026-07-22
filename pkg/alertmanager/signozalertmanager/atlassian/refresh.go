// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Resolve returns the org's connection with the given connection_id.
func Resolve(ctx context.Context, store alertmanagertypes.AtlassianConnectionStore, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error) {
	id, err := valuer.NewUUID(connectionID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "connection_id is not a valid uuid-v7")
	}

	conn, err := store.GetByID(ctx, orgID, id)
	if err != nil {
		return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAtlassianConnectionNotFound, "Atlassian connection has expired or is invalid; please reconnect")
	}

	return conn, nil
}

// RefreshAndPersist exchanges the connection's refresh token for a fresh pair.
func RefreshAndPersist(ctx context.Context, store alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, conn *alertmanagertypes.AtlassianConnection, logger *slog.Logger) (*alertmanagertypes.AtlassianConnection, error) {
	tokens, err := refreshConnectionTokens(ctx, oauth, conn)
	if err != nil {
		return nil, err
	}

	conn.AccessToken = tokens.AccessToken
	if tokens.RefreshToken != "" {
		conn.RefreshToken = tokens.RefreshToken
	}
	conn.UpdatedAt = time.Now()

	if err := store.Update(ctx, conn); err != nil {
		logger.ErrorContext(ctx, "refreshed atlassian token but failed to persist it", slog.Any("err", err))
	}

	return conn, nil
}
