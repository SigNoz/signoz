// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

var discoveryClient = &http.Client{Timeout: 20 * time.Second}

// ErrTokenExpired signals that the access token used for a discovery call was
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

// ListTeams lists the teams of the Atlassian site identified by cloudID.
func ListTeams(ctx context.Context, accessToken, cloudID string) ([]Team, error) {
	url := fmt.Sprintf("https://api.atlassian.com/ex/jira/%s/jsm/ops/api/v1/teams", cloudID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := discoveryClient.Do(req)
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

	items, err := parseTeamItems(body)
	if err != nil {
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

// parseTeamItems decodes a JSM Ops teams list.
func parseTeamItems(body []byte) ([]teamItem, error) {
	if trimmed := bytes.TrimSpace(body); len(trimmed) > 0 && trimmed[0] == '{' {
		var wrapper struct {
			Values []teamItem `json:"values"`
			Data   []teamItem `json:"data"`
		}
		if err := json.Unmarshal(body, &wrapper); err != nil {
			return nil, err
		}
		if wrapper.Values != nil {
			return wrapper.Values, nil
		}
		return wrapper.Data, nil
	}

	var items []teamItem
	if err := json.Unmarshal(body, &items); err != nil {
		return nil, err
	}
	return items, nil
}
