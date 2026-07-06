// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

// Discovery helpers used by the channel form to populate Jira projects,
// issue types and create-issue field metadata. They talk to the Jira REST
// API directly with the credentials supplied in the request and never touch
// stored channel configuration.

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

// maxCloudPages bounds pagination so a misbehaving server cannot loop forever.
const maxCloudPages = 50

var discoveryClient = &http.Client{Timeout: 20 * time.Second}

// isCloudHost reports whether the target is Jira Cloud.
func isCloudHost(apiType, host string) bool {
	return apiType == "cloud" ||
		(apiType == "auto" && strings.HasSuffix(host, "atlassian.net"))
}

// GetMetadata returns the create-issue field metadata for a project and issue type.
func GetMetadata(ctx context.Context, req alertmanagertypes.JiraMetadataRequest) (*alertmanagertypes.JiraMetadataResponse, error) {
	if req.APIURL == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required")
	}
	if req.Username == "" || req.Password == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required")
	}
	if req.Project == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project is required")
	}
	if req.IssueType == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "issue_type is required")
	}

	baseURL, err := url.Parse(req.APIURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	var fields []alertmanagertypes.JiraFieldMetadata
	if isCloudHost(req.APIType, baseURL.Host) {
		fields, err = fetchCloudFieldMetadata(ctx, req)
	} else {
		fields, err = fetchDCFieldMetadata(ctx, req)
	}
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.JiraMetadataResponse{
		Project:   req.Project,
		IssueType: req.IssueType,
		Fields:    fields,
	}, nil
}

// ListProjects returns the projects visible to the supplied credentials.
func ListProjects(ctx context.Context, req alertmanagertypes.JiraProjectsRequest) (*alertmanagertypes.JiraProjectsResponse, error) {
	if req.APIURL == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required")
	}
	if req.Username == "" || req.Password == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required")
	}

	projectsURL, err := buildProjectsURL(req.APIURL)
	if err != nil {
		return nil, err
	}

	responseBody, err := doDiscoveryRequest(ctx, projectsURL.String(), req.Username, req.Password)
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
func ListProjectIssueTypes(ctx context.Context, req alertmanagertypes.JiraProjectIssueTypesRequest) (*alertmanagertypes.JiraProjectIssueTypesResponse, error) {
	if req.APIURL == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required")
	}
	if req.Username == "" || req.Password == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required")
	}
	if req.ProjectKey == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "project_key is required")
	}

	baseURL, err := url.Parse(req.APIURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	var issueTypes []alertmanagertypes.JiraIssueType
	if isCloudHost("auto", baseURL.Host) {
		issueTypes, err = listCloudIssueTypes(ctx, req)
	} else {
		issueTypes, err = listDCIssueTypes(ctx, req)
	}
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.JiraProjectIssueTypesResponse{
		ProjectKey: req.ProjectKey,
		IssueTypes: issueTypes,
	}, nil
}

type createMetaResponse struct {
	Projects []createMetaProject `json:"projects"`
}

type createMetaProject struct {
	Key        string            `json:"key"`
	IssueTypes []createMetaIssue `json:"issuetypes"`
}

type createMetaIssue struct {
	ID     string                     `json:"id"`
	Name   string                     `json:"name"`
	Fields map[string]createMetaField `json:"fields"`
}

type createMetaField struct {
	Required      bool             `json:"required"`
	Name          string           `json:"name"`
	Schema        createMetaSchema `json:"schema"`
	AllowedValues []map[string]any `json:"allowedValues"`
}

type createMetaSchema struct {
	Type     string `json:"type"`
	Items    string `json:"items"`
	System   string `json:"system"`
	Custom   string `json:"custom"`
	CustomID int    `json:"customId"`
}

// fetchDCFieldMetadata loads create-issue field metadata from Jira Data Center.
func fetchDCFieldMetadata(ctx context.Context, req alertmanagertypes.JiraMetadataRequest) ([]alertmanagertypes.JiraFieldMetadata, error) {
	metadataURL, err := buildCreateMetaURL(req.APIURL, req.Project, req.IssueType)
	if err != nil {
		return nil, err
	}

	respBody, err := doDiscoveryRequest(ctx, metadataURL.String(), req.Username, req.Password)
	if err != nil {
		return nil, err
	}

	var meta createMetaResponse
	if err := json.Unmarshal(respBody, &meta); err != nil {
		return nil, err
	}

	return flattenFields(meta), nil
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

// fetchCloudFieldMetadata loads create-issue field metadata from Jira Cloud.
func fetchCloudFieldMetadata(ctx context.Context, req alertmanagertypes.JiraMetadataRequest) ([]alertmanagertypes.JiraFieldMetadata, error) {
	baseURL, err := v3BaseURL(req.APIURL)
	if err != nil {
		return nil, err
	}

	issueTypeID, err := resolveCloudIssueTypeID(ctx, baseURL, req)
	if err != nil {
		return nil, err
	}

	return fetchCloudFields(ctx, baseURL, req, issueTypeID)
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
func pageCloudIssueTypes(ctx context.Context, baseURL *url.URL, project, username, password string) ([]cloudIssueType, error) {
	issueTypes := make([]cloudIssueType, 0)
	startAt := 0
	for range maxCloudPages {
		pageURL := cloudCreateMetaURL(baseURL, startAt, project, "issuetypes")
		body, err := doDiscoveryRequest(ctx, pageURL, username, password)
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

func resolveCloudIssueTypeID(ctx context.Context, baseURL *url.URL, req alertmanagertypes.JiraMetadataRequest) (string, error) {
	issueTypes, err := pageCloudIssueTypes(ctx, baseURL, req.Project, req.Username, req.Password)
	if err != nil {
		return "", err
	}

	for _, issueType := range issueTypes {
		if strings.EqualFold(issueType.Name, req.IssueType) {
			return issueType.ID, nil
		}
	}

	return "", errors.NewNotFoundf(errors.CodeNotFound, "issue type %q not found in project %q", req.IssueType, req.Project)
}

// listCloudIssueTypes returns the creatable issue types for a Jira Cloud project.
func listCloudIssueTypes(ctx context.Context, req alertmanagertypes.JiraProjectIssueTypesRequest) ([]alertmanagertypes.JiraIssueType, error) {
	baseURL, err := v3BaseURL(req.APIURL)
	if err != nil {
		return nil, err
	}

	cloudTypes, err := pageCloudIssueTypes(ctx, baseURL, req.ProjectKey, req.Username, req.Password)
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

	return issueTypes, nil
}

// listDCIssueTypes returns the creatable issue types for a Jira Data Center project.
func listDCIssueTypes(ctx context.Context, req alertmanagertypes.JiraProjectIssueTypesRequest) ([]alertmanagertypes.JiraIssueType, error) {
	metadataURL, err := buildCreateMetaURL(req.APIURL, req.ProjectKey, "")
	if err != nil {
		return nil, err
	}

	body, err := doDiscoveryRequest(ctx, metadataURL.String(), req.Username, req.Password)
	if err != nil {
		return nil, err
	}

	var meta createMetaResponse
	if err := json.Unmarshal(body, &meta); err != nil {
		return nil, err
	}

	issueTypes := make([]alertmanagertypes.JiraIssueType, 0)
	for _, project := range meta.Projects {
		for _, issueType := range project.IssueTypes {
			issueTypes = append(issueTypes, alertmanagertypes.JiraIssueType{
				ID:   issueType.ID,
				Name: issueType.Name,
			})
		}
	}

	return issueTypes, nil
}

func fetchCloudFields(ctx context.Context, baseURL *url.URL, req alertmanagertypes.JiraMetadataRequest, issueTypeID string) ([]alertmanagertypes.JiraFieldMetadata, error) {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	startAt := 0
	for range maxCloudPages {
		pageURL := cloudCreateMetaURL(baseURL, startAt, req.Project, "issuetypes", issueTypeID)
		body, err := doDiscoveryRequest(ctx, pageURL, req.Username, req.Password)
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

// buildCreateMetaURL builds the Jira Data Center bulk createmeta URL.
func buildCreateMetaURL(apiURL, project, issueType string) (*url.URL, error) {
	baseURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	path := strings.TrimSuffix(baseURL.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		path = path + "/rest/api/2"
	}

	baseURL.Path = strings.TrimSuffix(path, "/") + "/issue/createmeta"
	query := baseURL.Query()
	query.Set("projectKeys", project)
	// When no issue type is given, omit the filter so the response includes every creatable issue type.
	if issueType != "" {
		query.Set("issuetypeNames", issueType)
	}
	query.Set("expand", "projects.issuetypes.fields")
	baseURL.RawQuery = query.Encode()

	return baseURL, nil
}

func flattenFields(meta createMetaResponse) []alertmanagertypes.JiraFieldMetadata {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	for _, project := range meta.Projects {
		for _, issueType := range project.IssueTypes {
			for fieldID, field := range issueType.Fields {
				fields = append(fields, alertmanagertypes.JiraFieldMetadata{
					ID:             fieldID,
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
		}
	}

	sortFieldsByName(fields)

	return fields
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

func buildProjectsURL(apiURL string) (*url.URL, error) {
	parsed, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	if isCloudHost("auto", parsed.Host) {
		baseURL, err := v3BaseURL(apiURL)
		if err != nil {
			return nil, err
		}

		baseURL.Path += "/project/search"
		query := baseURL.Query()
		query.Set("maxResults", "200")
		baseURL.RawQuery = query.Encode()

		return baseURL, nil
	}

	path := strings.TrimSuffix(parsed.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		path += "/rest/api/2"
	}
	parsed.Path = strings.TrimSuffix(path, "/") + "/project"

	return parsed, nil
}

// v3BaseURL parses apiURL and normalizes its path to target the Jira v3 REST API.
func v3BaseURL(apiURL string) (*url.URL, error) {
	baseURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	path := strings.TrimSuffix(baseURL.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		path += "/rest/api/3"
	} else if strings.Contains(path, "/rest/api/2") {
		path = strings.Replace(path, "/rest/api/2", "/rest/api/3", 1)
	}

	baseURL.Path = strings.TrimSuffix(path, "/")
	return baseURL, nil
}

func doDiscoveryRequest(ctx context.Context, url, username, password string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(username, password)
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

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func parseProjects(responseBody []byte) ([]alertmanagertypes.JiraProject, error) {
	var searchResponse projectSearchResponse
	if err := json.Unmarshal(responseBody, &searchResponse); err == nil && searchResponse.Values != nil {
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

	var arrayResponse []projectItem
	if err := json.Unmarshal(responseBody, &arrayResponse); err != nil {
		return nil, err
	}

	projects := make([]alertmanagertypes.JiraProject, 0, len(arrayResponse))
	for _, project := range arrayResponse {
		projects = append(projects, alertmanagertypes.JiraProject{
			ID:   project.ID,
			Key:  project.Key,
			Name: project.Name,
		})
	}

	return projects, nil
}
