// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// maxCloudPages bounds pagination.
const maxCloudPages = 50

var discoveryClient = &http.Client{Timeout: 20 * time.Second}

// ErrTokenExpired signals that the access token used for a discovery call was
// rejected with a 401, so the caller may refresh it and retry.
var ErrTokenExpired = errors.NewUnauthenticatedf(errors.CodeUnauthenticated, "jira access token expired")

// v3Base returns the Jira Cloud REST v3 base URL for a cloud id.
func v3Base(cloudID string) (*url.URL, error) {
	if cloudID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "cloud_id is required")
	}
	return url.Parse(fmt.Sprintf("%s/%s/rest/api/3", strings.TrimRight(defaultBaseURL, "/"), cloudID))
}

// GetMetadata returns the create-issue field metadata for a project and issue type.
func GetMetadata(ctx context.Context, accessToken, cloudID, project, issueType string) (*alertmanagertypes.JiraMetadataResponse, error) {
	if project == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project is required")
	}
	if issueType == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "issue_type is required")
	}

	baseURL, err := v3Base(cloudID)
	if err != nil {
		return nil, err
	}

	issueTypeID, err := resolveCloudIssueTypeID(ctx, baseURL, accessToken, project, issueType)
	if err != nil {
		return nil, err
	}

	fields, err := fetchCloudFields(ctx, baseURL, accessToken, project, issueTypeID)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.JiraMetadataResponse{
		Project:   project,
		IssueType: issueType,
		Fields:    fields,
	}, nil
}

// ListProjects returns the projects visible to the connection.
func ListProjects(ctx context.Context, accessToken, cloudID string) (*alertmanagertypes.JiraProjectsResponse, error) {
	baseURL, err := v3Base(cloudID)
	if err != nil {
		return nil, err
	}

	projectsURL := *baseURL
	projectsURL.Path = strings.TrimSuffix(baseURL.Path, "/") + "/project/search"
	query := projectsURL.Query()
	query.Set("maxResults", "200")
	projectsURL.RawQuery = query.Encode()

	responseBody, err := doDiscoveryRequest(ctx, projectsURL.String(), accessToken)
	if err != nil {
		return nil, err
	}

	projects, err := parseProjects(responseBody)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.JiraProjectsResponse{Projects: projects}, nil
}

// ListProjectIssueTypes returns the creatable issue types for a project.
func ListProjectIssueTypes(ctx context.Context, accessToken, cloudID, projectKey string) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
	if projectKey == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project_key is required")
	}

	baseURL, err := v3Base(cloudID)
	if err != nil {
		return nil, err
	}

	cloudTypes, err := pageCloudIssueTypes(ctx, baseURL, accessToken, projectKey)
	if err != nil {
		return nil, err
	}

	issueTypes := make([]alertmanagertypes.JiraIssueType, 0, len(cloudTypes))
	for _, issueType := range cloudTypes {
		issueTypes = append(issueTypes, alertmanagertypes.JiraIssueType{
			ID:   issueType.ID,
			Name: issueType.Name,
		})
	}

	return &alertmanagertypes.JiraProjectIssueTypesResponse{
		ProjectKey: projectKey,
		IssueTypes: issueTypes,
	}, nil
}

type createMetaSchema struct {
	Type     string `json:"type"`
	Items    string `json:"items"`
	System   string `json:"system"`
	Custom   string `json:"custom"`
	CustomID int    `json:"customId"`
}

// cloudPage holds the common pagination envelope returned by the Jira Cloud createmeta endpoints.
type cloudPage struct {
	StartAt int  `json:"startAt"`
	Total   int  `json:"total"`
	IsLast  bool `json:"isLast"`
}

type cloudIssueType struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type cloudIssueTypesPage struct {
	cloudPage
	IssueTypes []cloudIssueType `json:"issueTypes"`
}

type cloudField struct {
	FieldID       string           `json:"fieldId"`
	Name          string           `json:"name"`
	Required      bool             `json:"required"`
	Schema        createMetaSchema `json:"schema"`
	AllowedValues []map[string]any `json:"allowedValues"`
}

type cloudFieldsPage struct {
	cloudPage
	Fields []cloudField `json:"fields"`
}

// cloudCreateMetaURL builds a paginated createmeta URL under the v3 base.
func cloudCreateMetaURL(baseURL *url.URL, startAt int, segments ...string) string {
	pageURL := *baseURL
	base := strings.TrimSuffix(baseURL.Path, "/")
	pageURL.Path = strings.Join(append([]string{base, "issue", "createmeta"}, segments...), "/")
	query := pageURL.Query()
	query.Set("startAt", strconv.Itoa(startAt))
	pageURL.RawQuery = query.Encode()
	return pageURL.String()
}

// pageCloudIssueTypes pages through the Jira Cloud issuetypes endpoint and returns every creatable
// issue type for the project.
func pageCloudIssueTypes(ctx context.Context, baseURL *url.URL, accessToken, project string) ([]cloudIssueType, error) {
	issueTypes := make([]cloudIssueType, 0)
	startAt := 0
	for range maxCloudPages {
		pageURL := cloudCreateMetaURL(baseURL, startAt, project, "issuetypes")
		body, err := doDiscoveryRequest(ctx, pageURL, accessToken)
		if err != nil {
			return nil, err
		}

		var result cloudIssueTypesPage
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, err
		}

		issueTypes = append(issueTypes, result.IssueTypes...)

		startAt += len(result.IssueTypes)
		if result.IsLast || len(result.IssueTypes) == 0 || startAt >= result.Total {
			break
		}
	}

	return issueTypes, nil
}

func resolveCloudIssueTypeID(ctx context.Context, baseURL *url.URL, accessToken, project, issueType string) (string, error) {
	issueTypes, err := pageCloudIssueTypes(ctx, baseURL, accessToken, project)
	if err != nil {
		return "", err
	}

	for _, it := range issueTypes {
		if strings.EqualFold(it.Name, issueType) {
			return it.ID, nil
		}
	}

	return "", errors.NewNotFoundf(errors.CodeNotFound, "issue type %q not found in project %q", issueType, project)
}

func fetchCloudFields(ctx context.Context, baseURL *url.URL, accessToken, project, issueTypeID string) ([]alertmanagertypes.JiraFieldMetadata, error) {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	startAt := 0
	for range maxCloudPages {
		pageURL := cloudCreateMetaURL(baseURL, startAt, project, "issuetypes", issueTypeID)
		body, err := doDiscoveryRequest(ctx, pageURL, accessToken)
		if err != nil {
			return nil, err
		}

		var result cloudFieldsPage
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, err
		}

		for _, field := range result.Fields {
			fields = append(fields, alertmanagertypes.JiraFieldMetadata{
				ID:             field.FieldID,
				Name:           field.Name,
				Required:       field.Required,
				SchemaType:     field.Schema.Type,
				SchemaItems:    field.Schema.Items,
				SchemaSystem:   field.Schema.System,
				SchemaCustom:   field.Schema.Custom,
				SchemaCustomID: field.Schema.CustomID,
				AllowedValues:  extractAllowedValues(field.AllowedValues),
			})
		}

		startAt += len(result.Fields)
		if result.IsLast || len(result.Fields) == 0 || startAt >= result.Total {
			break
		}
	}

	sortFieldsByName(fields)

	return fields, nil
}

func sortFieldsByName(fields []alertmanagertypes.JiraFieldMetadata) {
	sort.Slice(fields, func(i, j int) bool {
		return strings.ToLower(fields[i].Name) < strings.ToLower(fields[j].Name)
	})
}

func extractAllowedValues(values []map[string]any) []alertmanagertypes.JiraAllowedValue {
	if len(values) == 0 {
		return nil
	}

	stringField := func(value map[string]any, keys ...string) string {
		for _, key := range keys {
			if raw, ok := value[key]; ok {
				if str, ok := raw.(string); ok && str != "" {
					return str
				}
			}
		}
		return ""
	}

	allowed := make([]alertmanagertypes.JiraAllowedValue, 0, len(values))
	for _, value := range values {
		val := stringField(value, "value", "name", "key", "id")
		if val == "" {
			continue
		}
		allowed = append(allowed, alertmanagertypes.JiraAllowedValue{
			Label: val,
			Value: val,
		})
	}

	return allowed
}

type projectSearchResponse struct {
	Values []projectItem `json:"values"`
}

type projectItem struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

func doDiscoveryRequest(ctx context.Context, reqURL, accessToken string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := discoveryClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func parseProjects(responseBody []byte) ([]alertmanagertypes.JiraProject, error) {
	var searchResponse projectSearchResponse
	if err := json.Unmarshal(responseBody, &searchResponse); err != nil {
		return nil, err
	}

	projects := make([]alertmanagertypes.JiraProject, 0, len(searchResponse.Values))
	for _, project := range searchResponse.Values {
		projects = append(projects, alertmanagertypes.JiraProject{
			ID:   project.ID,
			Key:  project.Key,
			Name: project.Name,
		})
	}

	return projects, nil
}
