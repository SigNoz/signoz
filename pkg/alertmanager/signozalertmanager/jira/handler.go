// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type Handler struct {
	discovery *DiscoveryService
}

func NewHandler(am alertmanager.Alertmanager) *Handler {
	return &Handler{
		discovery: NewDiscoveryService(am.AtlassianConnectionStore(), am.AtlassianOAuthConfig(), slog.Default()),
	}
}

// Metadata returns the create-issue field metadata for a project and issue type.
func (h *Handler) Metadata(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var request alertmanagertypes.JiraMetadataRequest
	if err := decodeBody(req, &request); err != nil {
		render.Error(rw, err)
		return
	}

	response, err := h.discovery.Metadata(ctx, claims.OrgID, request.ConnectionID, request.Project, request.IssueType)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

// Projects lists the Jira projects visible to a connection.
func (h *Handler) Projects(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var request alertmanagertypes.JiraProjectsRequest
	if err := decodeBody(req, &request); err != nil {
		render.Error(rw, err)
		return
	}

	response, err := h.discovery.Projects(ctx, claims.OrgID, request.ConnectionID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

// Users lists the users assignable to issues in a project.
func (h *Handler) Users(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var request alertmanagertypes.JiraUsersRequest
	if err := decodeBody(req, &request); err != nil {
		render.Error(rw, err)
		return
	}

	response, err := h.discovery.Users(ctx, claims.OrgID, request.ConnectionID, request.ProjectKey, request.Query)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

// ProjectIssueTypes lists the creatable issue types for a project.
func (h *Handler) ProjectIssueTypes(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var request alertmanagertypes.JiraProjectIssueTypesRequest
	if err := decodeBody(req, &request); err != nil {
		render.Error(rw, err)
		return
	}

	response, err := h.discovery.IssueTypes(ctx, claims.OrgID, request.ConnectionID, request.ProjectKey)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

func decodeBody(req *http.Request, target any) error {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return err
	}
	defer req.Body.Close() //nolint:errcheck

	return json.Unmarshal(body, target)
}
