package signozalertmanager

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

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	alertmanager alertmanager.Alertmanager
}

func NewHandler(alertmanager alertmanager.Alertmanager) alertmanager.Handler {
	return &handler{alertmanager: alertmanager}
}

func (handler *handler) GetAlerts(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	params, err := alertmanagertypes.NewGettableAlertsParams(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	alerts, err := handler.alertmanager.GetAlerts(ctx, claims.OrgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alerts)
}

func (handler *handler) TestReceiver(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.alertmanager.TestReceiver(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) GetJiraMetadata(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	var metadataRequest alertmanagertypes.JiraMetadataRequest
	if err := json.Unmarshal(body, &metadataRequest); err != nil {
		render.Error(rw, err)
		return
	}

	if metadataRequest.APIURL == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required"))
		return
	}
	if metadataRequest.Username == "" || metadataRequest.Password == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required"))
		return
	}
	if metadataRequest.Project == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "project is required"))
		return
	}
	if metadataRequest.IssueType == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "issue_type is required"))
		return
	}

	baseURL, err := url.Parse(metadataRequest.APIURL)
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err))
		return
	}

	var fields []alertmanagertypes.JiraFieldMetadata
	if isJiraCloud(metadataRequest.APIType, baseURL.Host) {
		fields, err = fetchJiraCloudFieldMetadata(ctx, metadataRequest)
	} else {
		fields, err = fetchJiraDCFieldMetadata(ctx, metadataRequest)
	}
	if err != nil {
		render.Error(rw, err)
		return
	}

	response := alertmanagertypes.JiraMetadataResponse{
		Project:   metadataRequest.Project,
		IssueType: metadataRequest.IssueType,
		Fields:    fields,
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) ListJiraProjects(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	var request alertmanagertypes.JiraProjectsRequest
	if err := json.Unmarshal(body, &request); err != nil {
		render.Error(rw, err)
		return
	}

	if request.APIURL == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required"))
		return
	}
	if request.Username == "" || request.Password == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required"))
		return
	}

	projectsURL, err := buildJiraProjectsURL(request.APIURL)
	if err != nil {
		render.Error(rw, err)
		return
	}

	responseBody, err := doJiraRequest(ctx, projectsURL.String(), request.Username, request.Password)
	if err != nil {
		render.Error(rw, err)
		return
	}

	projects, err := parseJiraProjects(responseBody)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alertmanagertypes.JiraProjectsResponse{Projects: projects})
}

func (handler *handler) ListJiraProjectIssueTypes(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	var request alertmanagertypes.JiraProjectIssueTypesRequest
	if err := json.Unmarshal(body, &request); err != nil {
		render.Error(rw, err)
		return
	}

	if request.APIURL == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "api_url is required"))
		return
	}
	if request.Username == "" || request.Password == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "username and password are required"))
		return
	}
	if request.ProjectKey == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "project_key is required"))
		return
	}

	baseURL, err := url.Parse(request.APIURL)
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err))
		return
	}

	var issueTypes []alertmanagertypes.JiraIssueType
	if isJiraCloud("auto", baseURL.Host) {
		issueTypes, err = listJiraCloudIssueTypes(ctx, request)
	} else {
		issueTypes, err = listJiraDCIssueTypes(ctx, request)
	}
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alertmanagertypes.JiraProjectIssueTypesResponse{
		ProjectKey: request.ProjectKey,
		IssueTypes: issueTypes,
	})
}

type jiraCreateMetaResponse struct {
	Projects []jiraCreateMetaProject `json:"projects"`
}

type jiraCreateMetaProject struct {
	Key        string                `json:"key"`
	IssueTypes []jiraCreateMetaIssue `json:"issuetypes"`
}

type jiraCreateMetaIssue struct {
	ID     string                         `json:"id"`
	Name   string                         `json:"name"`
	Fields map[string]jiraCreateMetaField `json:"fields"`
}

type jiraCreateMetaField struct {
	Required      bool                 `json:"required"`
	Name          string               `json:"name"`
	Schema        jiraCreateMetaSchema `json:"schema"`
	AllowedValues []map[string]any     `json:"allowedValues"`
}

type jiraCreateMetaSchema struct {
	Type     string `json:"type"`
	Items    string `json:"items"`
	System   string `json:"system"`
	Custom   string `json:"custom"`
	CustomID int    `json:"customId"`
}

// isJiraCloud reports whether the target is Jira Cloud.
func isJiraCloud(apiType, host string) bool {
	return apiType == "cloud" ||
		(apiType == "auto" && strings.HasSuffix(host, "atlassian.net"))
}

// fetchJiraDCFieldMetadata loads create-issue field metadata from Jira Data Center.
func fetchJiraDCFieldMetadata(ctx context.Context, req alertmanagertypes.JiraMetadataRequest) ([]alertmanagertypes.JiraFieldMetadata, error) {
	metadataURL, err := buildJiraCreateMetaURL(req.APIURL, req.Project, req.IssueType)
	if err != nil {
		return nil, err
	}

	respBody, err := doJiraRequest(ctx, metadataURL.String(), req.Username, req.Password)
	if err != nil {
		return nil, err
	}

	var jiraMeta jiraCreateMetaResponse
	if err := json.Unmarshal(respBody, &jiraMeta); err != nil {
		return nil, err
	}

	return flattenJiraFields(jiraMeta), nil
}

// jiraCloudPage holds the common pagination envelope returned by the Jira Cloud createmeta endpoints.
type jiraCloudPage struct {
	StartAt int  `json:"startAt"`
	Total   int  `json:"total"`
	IsLast  bool `json:"isLast"`
}

type jiraCloudIssueType struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type jiraCloudIssueTypesPage struct {
	jiraCloudPage
	IssueTypes []jiraCloudIssueType `json:"issueTypes"`
}

type jiraCloudField struct {
	FieldID       string               `json:"fieldId"`
	Name          string               `json:"name"`
	Required      bool                 `json:"required"`
	Schema        jiraCreateMetaSchema `json:"schema"`
	AllowedValues []map[string]any     `json:"allowedValues"`
}

type jiraCloudFieldsPage struct {
	jiraCloudPage
	Fields []jiraCloudField `json:"fields"`
}

// maxJiraCloudPages bounds pagination so a misbehaving server cannot loop forever.
const maxJiraCloudPages = 50

// fetchJiraCloudFieldMetadata loads create-issue field metadata from Jira Cloud.
func fetchJiraCloudFieldMetadata(ctx context.Context, req alertmanagertypes.JiraMetadataRequest) ([]alertmanagertypes.JiraFieldMetadata, error) {
	baseURL, err := jiraV3BaseURL(req.APIURL)
	if err != nil {
		return nil, err
	}

	issueTypeID, err := resolveJiraCloudIssueTypeID(ctx, baseURL, req)
	if err != nil {
		return nil, err
	}

	return fetchJiraCloudFields(ctx, baseURL, req, issueTypeID)
}

// jiraCloudCreateMetaURL builds a paginated createmeta URL under the v3 base.
func jiraCloudCreateMetaURL(baseURL *url.URL, startAt int, segments ...string) string {
	pageURL := *baseURL
	base := strings.TrimSuffix(baseURL.Path, "/")
	pageURL.Path = strings.Join(append([]string{base, "issue", "createmeta"}, segments...), "/")
	query := pageURL.Query()
	query.Set("startAt", strconv.Itoa(startAt))
	pageURL.RawQuery = query.Encode()
	return pageURL.String()
}

// pageJiraCloudIssueTypes pages through the Jira Cloud issuetypes endpoint and returns every creatable
// issue type for the project.
func pageJiraCloudIssueTypes(ctx context.Context, baseURL *url.URL, project, username, password string) ([]jiraCloudIssueType, error) {
	issueTypes := make([]jiraCloudIssueType, 0)
	startAt := 0
	for range maxJiraCloudPages {
		pageURL := jiraCloudCreateMetaURL(baseURL, startAt, project, "issuetypes")
		body, err := doJiraRequest(ctx, pageURL, username, password)
		if err != nil {
			return nil, err
		}

		var result jiraCloudIssueTypesPage
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

func resolveJiraCloudIssueTypeID(ctx context.Context, baseURL *url.URL, req alertmanagertypes.JiraMetadataRequest) (string, error) {
	issueTypes, err := pageJiraCloudIssueTypes(ctx, baseURL, req.Project, req.Username, req.Password)
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

// listJiraCloudIssueTypes returns the creatable issue types for a Jira Cloud
// project, used to populate the issue-type dropdown.
func listJiraCloudIssueTypes(ctx context.Context, req alertmanagertypes.JiraProjectIssueTypesRequest) ([]alertmanagertypes.JiraIssueType, error) {
	baseURL, err := jiraV3BaseURL(req.APIURL)
	if err != nil {
		return nil, err
	}

	cloudTypes, err := pageJiraCloudIssueTypes(ctx, baseURL, req.ProjectKey, req.Username, req.Password)
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

// listJiraDCIssueTypes returns the creatable issue types for a Jira Data Center project.
func listJiraDCIssueTypes(ctx context.Context, req alertmanagertypes.JiraProjectIssueTypesRequest) ([]alertmanagertypes.JiraIssueType, error) {
	metadataURL, err := buildJiraCreateMetaURL(req.APIURL, req.ProjectKey, "")
	if err != nil {
		return nil, err
	}

	body, err := doJiraRequest(ctx, metadataURL.String(), req.Username, req.Password)
	if err != nil {
		return nil, err
	}

	var meta jiraCreateMetaResponse
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

func fetchJiraCloudFields(ctx context.Context, baseURL *url.URL, req alertmanagertypes.JiraMetadataRequest, issueTypeID string) ([]alertmanagertypes.JiraFieldMetadata, error) {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	startAt := 0
	for range maxJiraCloudPages {
		pageURL := jiraCloudCreateMetaURL(baseURL, startAt, req.Project, "issuetypes", issueTypeID)
		body, err := doJiraRequest(ctx, pageURL, req.Username, req.Password)
		if err != nil {
			return nil, err
		}

		var result jiraCloudFieldsPage
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
				AllowedValues:  extractJiraAllowedValues(field.AllowedValues),
			})
		}

		startAt += len(result.Fields)
		if result.IsLast || len(result.Fields) == 0 || startAt >= result.Total {
			break
		}
	}

	sort.Slice(fields, func(i, j int) bool {
		return strings.ToLower(fields[i].Name) < strings.ToLower(fields[j].Name)
	})

	return fields, nil
}

// buildJiraCreateMetaURL builds the Jira Data Center bulk createmeta URL.
func buildJiraCreateMetaURL(apiURL, project, issueType string) (*url.URL, error) {
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

func flattenJiraFields(meta jiraCreateMetaResponse) []alertmanagertypes.JiraFieldMetadata {
	fields := make([]alertmanagertypes.JiraFieldMetadata, 0)
	for _, project := range meta.Projects {
		for _, issueType := range project.IssueTypes {
			for fieldID, field := range issueType.Fields {
				allowedValues := extractJiraAllowedValues(field.AllowedValues)
				fields = append(fields, alertmanagertypes.JiraFieldMetadata{
					ID:             fieldID,
					Name:           field.Name,
					Required:       field.Required,
					SchemaType:     field.Schema.Type,
					SchemaItems:    field.Schema.Items,
					SchemaSystem:   field.Schema.System,
					SchemaCustom:   field.Schema.Custom,
					SchemaCustomID: field.Schema.CustomID,
					AllowedValues:  allowedValues,
				})
			}
		}
	}

	sort.Slice(fields, func(i, j int) bool {
		return strings.ToLower(fields[i].Name) < strings.ToLower(fields[j].Name)
	})

	return fields
}

func extractJiraAllowedValues(values []map[string]any) []alertmanagertypes.JiraAllowedValue {
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

type jiraProjectSearchResponse struct {
	Values []jiraProjectItem `json:"values"`
}

type jiraProjectItem struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

func buildJiraProjectsURL(apiURL string) (*url.URL, error) {
	parsed, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	if isJiraCloud("auto", parsed.Host) {
		baseURL, err := jiraV3BaseURL(apiURL)
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

// jiraV3BaseURL parses apiURL and normalizes its path to target the Jira v3 REST API.
func jiraV3BaseURL(apiURL string) (*url.URL, error) {
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

func doJiraRequest(ctx context.Context, url, username, password string) ([]byte, error) {
	jiraReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	jiraReq.SetBasicAuth(username, password)
	jiraReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(jiraReq)
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

func parseJiraProjects(responseBody []byte) ([]alertmanagertypes.JiraProject, error) {
	var searchResponse jiraProjectSearchResponse
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

	var arrayResponse []jiraProjectItem
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

func (handler *handler) ListChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels, err := handler.alertmanager.ListChannels(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	// This ensures that the UI receives an empty array instead of null
	if len(channels) == 0 {
		channels = make([]*alertmanagertypes.Channel, 0)
	}

	render.Success(rw, http.StatusOK, channels)
}

func (handler *handler) ListAllChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	channels, err := handler.alertmanager.ListAllChannels(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channels)
}

func (handler *handler) GetChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	channel, err := handler.alertmanager.GetChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channel)
}

func (handler *handler) UpdateChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.alertmanager.UpdateChannelByReceiverAndID(ctx, claims.OrgID, receiver, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	err = handler.alertmanager.DeleteChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) CreateChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	// TODO: Move to PostableChannel and binding package
	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	channel, err := handler.alertmanager.CreateChannel(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, channel)
}

func (handler *handler) CreateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close()
	var policy alertmanagertypes.PostableRoutePolicy
	err = json.Unmarshal(body, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}

	policy.ExpressionKind = alertmanagertypes.PolicyBasedExpression

	// Validate the postable route
	if err := policy.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := handler.alertmanager.CreateRoutePolicy(ctx, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, result)
}

func (handler *handler) GetAllRoutePolicies(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	policies, err := handler.alertmanager.GetAllRoutePolicies(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policies)
}

func (handler *handler) GetRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	policy, err := handler.alertmanager.GetRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policy)
}

func (handler *handler) DeleteRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	err := handler.alertmanager.DeleteRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) UpdateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close()
	var policy alertmanagertypes.PostableRoutePolicy
	err = json.Unmarshal(body, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}
	policy.ExpressionKind = alertmanagertypes.PolicyBasedExpression

	// Validate the postable route
	if err := policy.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := handler.alertmanager.UpdateRoutePolicyByID(ctx, policyID, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, result)
}
