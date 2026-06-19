// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
)

// ErrTokenExpired signals that the JSM Ops access token used to list teams was
// rejected with a 401, so the caller may refresh it and retry.
var ErrTokenExpired = errors.NewUnauthenticatedf(errors.CodeUnauthenticated, "jsm ops access token expired")

// Team is a JSM Ops team offered as an alert responder.
type Team struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type teamItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	TeamID   string `json:"teamId"`
	TeamName string `json:"teamName"`
}

func (t teamItem) id() string {
	if t.TeamID != "" {
		return t.TeamID
	}
	return t.ID
}

func (t teamItem) name() string {
	if t.TeamName != "" {
		return t.TeamName
	}
	return t.Name
}

// fetchTeams lists the teams of the Atlassian site identified by cloudID.
func fetchTeams(ctx context.Context, accessToken, cloudID string) ([]Team, error) {
	url := fmt.Sprintf("https://api.atlassian.com/ex/jira/%s/jsm/ops/api/v1/teams", cloudID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}
	if resp.StatusCode != http.StatusOK {
		return nil, errors.NewInternalf(errors.CodeInternal, "jsm ops teams lookup failed with status %d: %s", resp.StatusCode, string(body))
	}

	var items []teamItem
	if err := json.Unmarshal(body, &items); err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "failed to parse jsm ops teams response: %v", err)
	}

	teams := make([]Team, 0, len(items))
	for _, t := range items {
		if t.id() == "" {
			continue
		}
		teams = append(teams, Team{ID: t.id(), Name: t.name()})
	}
	return teams, nil
}
