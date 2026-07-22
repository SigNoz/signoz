// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	jiranotify "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/jira"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager/atlassian"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type DiscoveryService struct {
	store  alertmanagertypes.AtlassianConnectionStore
	oauth  alertmanager.AtlassianOAuthConfig
	logger *slog.Logger
}

func NewDiscoveryService(store alertmanagertypes.AtlassianConnectionStore, oauth alertmanager.AtlassianOAuthConfig, logger *slog.Logger) *DiscoveryService {
	return &DiscoveryService{store: store, oauth: oauth, logger: logger}
}

// Projects lists the projects visible to a connection.
func (d *DiscoveryService) Projects(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.JiraProjectsResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(conn *alertmanagertypes.AtlassianConnection) (*alertmanagertypes.JiraProjectsResponse, error) {
		return jiranotify.ListProjects(ctx, conn)
	})
}

// IssueTypes lists the creatable issue types for a project.
func (d *DiscoveryService) IssueTypes(ctx context.Context, orgID, connectionID, projectKey string) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(conn *alertmanagertypes.AtlassianConnection) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
		return jiranotify.ListProjectIssueTypes(ctx, conn, projectKey)
	})
}

// Users lists the users assignable to issues in a project, optionally filtered by a query.
func (d *DiscoveryService) Users(ctx context.Context, orgID, connectionID, projectKey, query string) (*alertmanagertypes.JiraUsersResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(conn *alertmanagertypes.AtlassianConnection) (*alertmanagertypes.JiraUsersResponse, error) {
		return jiranotify.ListAssignableUsers(ctx, conn, projectKey, query)
	})
}

// Metadata returns the create-issue field metadata for a project and issue type.
func (d *DiscoveryService) Metadata(ctx context.Context, orgID, connectionID, project, issueType string) (*alertmanagertypes.JiraMetadataResponse, error) {
	return callWithRefresh(ctx, d, orgID, connectionID, func(conn *alertmanagertypes.AtlassianConnection) (*alertmanagertypes.JiraMetadataResponse, error) {
		return jiranotify.GetMetadata(ctx, conn, project, issueType)
	})
}

// callWithRefresh resolves the connection, runs fn against it, and on a token-expiry error refreshes the token once and retries.
func callWithRefresh[T any](ctx context.Context, d *DiscoveryService, orgID, connectionID string, fn func(conn *alertmanagertypes.AtlassianConnection) (T, error)) (T, error) {
	var zero T

	conn, err := atlassian.Resolve(ctx, d.store, orgID, connectionID)
	if err != nil {
		return zero, err
	}

	result, err := fn(conn)
	if !errors.Is(err, jiranotify.ErrTokenExpired) || conn.RefreshToken == "" {
		return result, err
	}

	refreshed, refreshErr := atlassian.RefreshAndPersist(ctx, d.store, d.oauth, conn, d.logger)
	if refreshErr != nil {
		return zero, refreshErr
	}

	return fn(refreshed)
}
