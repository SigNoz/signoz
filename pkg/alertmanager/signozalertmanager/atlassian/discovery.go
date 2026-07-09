// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jiranotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jira"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// DiscoveryService backs the channel form's Jira project/issue-type/metadata
// pickers. It resolves an OAuth connection by id, calls the Jira Cloud discovery
// API with the connection's access token, and refreshes the token once on 401.
type DiscoveryService struct {
	store  alertmanagertypes.AtlassianConnectionStore
	oauth  alertmanager.AtlassianOAuthConfig
	logger *slog.Logger
}

// NewDiscoveryService returns a DiscoveryService.
func NewDiscoveryService(store alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, logger *slog.Logger) *DiscoveryService {
	return &DiscoveryService{store: store, oauth: oauth, logger: logger}
}

// Projects lists the projects visible to a connection.
func (d *DiscoveryService) Projects(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.JiraProjectsResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(accessToken, cloudID string) (*alertmanagertypes.JiraProjectsResponse, error) {
		return jiranotify.ListProjects(ctx, accessToken, cloudID)
	})
}

// IssueTypes lists the creatable issue types for a project.
func (d *DiscoveryService) IssueTypes(ctx context.Context, orgID, connectionID, projectKey string) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(accessToken, cloudID string) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
		return jiranotify.ListProjectIssueTypes(ctx, accessToken, cloudID, projectKey)
	})
}

// Metadata returns the create-issue field metadata for a project and issue type.
func (d *DiscoveryService) Metadata(ctx context.Context, orgID, connectionID, project, issueType string) (*alertmanagertypes.JiraMetadataResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(accessToken, cloudID string) (*alertmanagertypes.JiraMetadataResponse, error) {
		return jiranotify.GetMetadata(ctx, accessToken, cloudID, project, issueType)
	})
}

// getConnection loads a connection owned by the org.
func (d *DiscoveryService) getConnection(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error) {
	id, err := valuer.NewUUID(connectionID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "connection_id is not a valid uuid-v7")
	}
	conn, err := d.store.GetByID(ctx, orgID, id)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "Atlassian connection has expired or is invalid; please reconnect")
	}
	return conn, nil
}

// callWithRefresh resolves the connection, runs fn with its access token, and on
// a token-expiry error refreshes the token once and retries.
func callWithRefresh[T any](ctx context.Context, d *DiscoveryService, orgID, connectionID string, fn func(accessToken, cloudID string) (T, error)) (T, error) {
	var zero T

	conn, err := d.getConnection(ctx, orgID, connectionID)
	if err != nil {
		return zero, err
	}

	result, err := fn(conn.AccessToken, conn.CloudID)
	if !errors.Is(err, jiranotify.ErrTokenExpired) || conn.RefreshToken == "" {
		return result, err
	}

	tokens, refreshErr := RefreshAccessToken(ctx, d.oauth, conn.RefreshToken)
	if refreshErr != nil {
		return zero, refreshErr
	}
	conn.AccessToken = tokens.AccessToken
	conn.RefreshToken = tokens.RefreshToken
	conn.UpdatedAt = time.Now()
	if updErr := d.store.Update(ctx, conn); updErr != nil {
		d.logger.ErrorContext(ctx, "refreshed jira token but failed to persist it", slog.Any("err", updErr))
	}

	return fn(conn.AccessToken, conn.CloudID)
}
