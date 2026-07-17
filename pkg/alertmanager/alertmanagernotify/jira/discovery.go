// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"context"
	"encoding/json"
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

// maxCreateMetaPages bounds pagination.
const maxCreateMetaPages = 50

var discoveryClient = &http.Client{Timeout: 20 * time.Second}

// ErrTokenExpired signals that the access token used for a discovery call was
// rejected with a 401, so the caller may refresh it and retry.
var ErrTokenExpired = errors.NewUnauthenticatedf(errors.CodeUnauthenticated, "jira access token expired")

// apiBase returns the parsed REST base URL for a connection.
func apiBase(conn *alertmanagertypes.AtlassianConnection) (*url.URL, error) {
	if conn == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "connection is required")
	}
	if conn.CloudID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "cloud_id is required")
	}
	return url.Parse(conn.APIBaseURL())
}

// GetMetadata returns the create-issue field metadata for a project and issue type.
func GetMetadata(ctx context.Context, conn *alertmanagertypes.AtlassianConnection, project, issueType string) (*alertmanagertypes.JiraMetadataResponse, error) {
	if project == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project is required")
	}
	if issueType == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "issue_type is required")
	}

	baseURL, err := apiBase(conn)
	if err != nil {
		return nil, err
	}

	issueTypeID, err := resolveIssueTypeID(ctx, baseURL, conn.AccessToken, project, issueType)
	if err != nil {
		return nil, err
	}

	fields, err := fetchFields(ctx, baseURL, conn.AccessToken, project, issueTypeID)
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
func ListProjects(ctx context.Context, conn *alertmanagertypes.AtlassianConnection) (*alertmanagertypes.JiraProjectsResponse, error) {
	baseURL, err := apiBase(conn)
	if err != nil {
		return nil, err
	}

	projectsURL := *baseURL
	projectsURL.Path = strings.TrimSuffix(baseURL.Path, "/") + "/project/search"
	query := projectsURL.Query()
	query.Set("maxResults", "200")
	projectsURL.RawQuery = query.Encode()

	responseBody, err := doDiscoveryRequest(ctx, projectsURL.String(), conn.AccessToken)
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
func ListProjectIssueTypes(ctx context.Context, conn *alertmanagertypes.AtlassianConnection, projectKey string) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
	if projectKey == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project_key is required")
	}

	baseURL, err := apiBase(conn)
	if err != nil {
		return nil, err
	}

	rawTypes, err := pageIssueTypes(ctx, baseURL, conn.AccessToken, projectKey)
	if err != nil {
		return nil, err
	}

	issueTypes := make([]alertmanagertypes.JiraIssueType, 0, len(rawTypes))
	for _, issueType := range rawTypes {
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

// ListAssignableUsers returns the users assignable to issues in a project.
func ListAssignableUsers(ctx context.Context, conn *alertmanagertypes.AtlassianConnection, projectKey, query string) (*alertmanagertypes.JiraUsersResponse, error) {
	if projectKey == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project_key is required")
	}

	baseURL, err := apiBase(conn)
	if err != nil {
		return nil, err
	}

	usersURL := *baseURL
	usersURL.Path = strings.TrimSuffix(baseURL.Path, "/") + "/user/assignable/search"
	params := usersURL.Query()
	params.Set("project", projectKey)
	params.Set("maxResults", "50")
	if query != "" {
		params.Set("query", query)
	}
	usersURL.RawQuery = params.Encode()

	responseBody, err := doDiscoveryRequest(ctx, usersURL.String(), conn.AccessToken)
	if err != nil {
		return nil, err
	}

	users, err := parseUsers(responseBody)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.JiraUsersResponse{Users: users}, nil
}

type createMetaSchema struct {
	Type     string `json:"type"`
	Items    string `json:"items"`
	System   string `json:"system"`
	Custom   string `json:"custom"`
	CustomID int    `json:"customId"`
}

// createMetaPage holds the common pagination envelope returned by the createmeta endpoints.
type createMetaPage struct {
	StartAt int  `json:"startAt"`
	Total   int  `json:"total"`
	IsLast  bool `json:"isLast"`
}

type metaIssueType struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type issueTypesPage struct {
	createMetaPage
	IssueTypes []metaIssueType `json:"issueTypes"`
}

type metaField struct {
	FieldID       string           `json:"fieldId"`
	Name          string           `json:"name"`
	Required      bool             `json:"required"`
	Schema        createMetaSchema `json:"schema"`
	AllowedValues []map[string]any `json:"allowedValues"`
}

type fieldsPage struct {
	createMetaPage
	Fields []metaField `json:"fields"`
}

// createMetaURL builds a paginated createmeta URL under the REST base.
func createMetaURL(baseURL *url.URL, startAt int, segments ...string) string {
	pageURL := *baseURL
	base := strings.TrimSuffix(baseURL.Path, "/")
	pageURL.Path = strings.Join(append([]string{base, "issue", "createmeta"}, segments...), "/")
	query := pageURL.Query()
	query.Set("startAt", strconv.Itoa(startAt))
	pageURL.RawQuery = query.Encode()
	return pageURL.String()
}

// pageIssueTypes pages through the createmeta issuetypes endpoint and returns every
// creatable issue type for the project.
func pageIssueTypes(ctx context.Context, baseURL *url.URL, accessToken, project string) ([]metaIssueType, error) {
	issueTypes := make([]metaIssueType, 0)
	startAt := 0
	for range maxCreateMetaPages {
		pageURL := createMetaURL(baseURL, startAt, project, "issuetypes")
		body, err := doDiscoveryRequest(ctx, pageURL, accessToken)
		if err != nil {
			return nil, err
		}

		var result issueTypesPage
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, err
		}

		items := result.IssueTypes
		issueTypes = append(issueTypes, items...)

		startAt += len(items)
		if result.IsLast || len(items) == 0 || (result.Total > 0 && startAt >= result.Total) {
			break
		}
	}

	return issueTypes, nil
}

func resolveIssueTypeID(ctx context.Context, baseURL *url.URL, accessToken, project, issueType string) (string, error) {
	issueTypes, err := pageIssueTypes(ctx, baseURL, accessToken, project)
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

func fetchFields(ctx context.Context, baseURL *url.URL, accessToken, project, issueTypeID string) ([]alertmanagertypes.JiraFieldMetadata, error) {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	startAt := 0
	for range maxCreateMetaPages {
		pageURL := createMetaURL(baseURL, startAt, project, "issuetypes", issueTypeID)
		body, err := doDiscoveryRequest(ctx, pageURL, accessToken)
		if err != nil {
			return nil, err
		}

		var result fieldsPage
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, err
		}

		items := result.Fields
		for _, field := range items {
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

		startAt += len(items)
		if result.IsLast || len(items) == 0 || (result.Total > 0 && startAt >= result.Total) {
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

type userItem struct {
	AccountID    string `json:"accountId"`
	DisplayName  string `json:"displayName"`
	EmailAddress string `json:"emailAddress"`
	Active       bool   `json:"active"`
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

// parseProjects reads the Cloud /project/search envelope.
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

// parseUsers reads the Cloud /user/assignable/search envelope.
func parseUsers(responseBody []byte) ([]alertmanagertypes.JiraUser, error) {
	var items []userItem
	if err := json.Unmarshal(responseBody, &items); err != nil {
		return nil, err
	}

	users := make([]alertmanagertypes.JiraUser, 0, len(items))
	for _, user := range items {
		if user.AccountID == "" {
			continue
		}
		users = append(users, alertmanagertypes.JiraUser{
			AccountID:    user.AccountID,
			DisplayName:  user.DisplayName,
			EmailAddress: user.EmailAddress,
			Active:       user.Active,
		})
	}

	return users, nil
}
