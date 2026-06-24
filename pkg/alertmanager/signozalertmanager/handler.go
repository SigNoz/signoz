package signozalertmanager

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"sort"
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

	metadataURL, err := buildJiraCreateMetaURL(metadataRequest.APIURL, metadataRequest.APIType, metadataRequest.Project, metadataRequest.IssueType)
	if err != nil {
		render.Error(rw, err)
		return
	}

	jiraReq, err := http.NewRequestWithContext(ctx, http.MethodGet, metadataURL.String(), nil)
	if err != nil {
		render.Error(rw, err)
		return
	}
	jiraReq.SetBasicAuth(metadataRequest.Username, metadataRequest.Password)
	jiraReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(jiraReq)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer resp.Body.Close() //nolint:errcheck

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira metadata request failed with status %d: %s", resp.StatusCode, string(respBody)))
		return
	}

	var jiraMeta jiraCreateMetaResponse
	if err := json.Unmarshal(respBody, &jiraMeta); err != nil {
		render.Error(rw, err)
		return
	}

	fields := flattenJiraFields(jiraMeta)
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

	issueTypesURL, err := buildJiraProjectIssueTypesURL(request.APIURL, request.ProjectKey)
	if err != nil {
		render.Error(rw, err)
		return
	}

	responseBody, err := doJiraRequest(ctx, issueTypesURL.String(), request.Username, request.Password)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var projectResponse jiraProjectDetailResponse
	if err := json.Unmarshal(responseBody, &projectResponse); err != nil {
		render.Error(rw, err)
		return
	}

	issueTypes := make([]alertmanagertypes.JiraIssueType, 0, len(projectResponse.IssueTypes))
	for _, issueType := range projectResponse.IssueTypes {
		issueTypes = append(issueTypes, alertmanagertypes.JiraIssueType{
			ID:   issueType.ID,
			Name: issueType.Name,
		})
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
	Key        string                 `json:"key"`
	IssueTypes []jiraCreateMetaIssue  `json:"issuetypes"`
}

type jiraCreateMetaIssue struct {
	Name   string                        `json:"name"`
	Fields map[string]jiraCreateMetaField `json:"fields"`
}

type jiraCreateMetaField struct {
	Required      bool                   `json:"required"`
	Name          string                 `json:"name"`
	Schema        jiraCreateMetaSchema   `json:"schema"`
	AllowedValues []map[string]any       `json:"allowedValues"`
}

type jiraCreateMetaSchema struct {
	Type     string `json:"type"`
	Items    string `json:"items"`
	System   string `json:"system"`
	Custom   string `json:"custom"`
	CustomID int    `json:"customId"`
}

func buildJiraCreateMetaURL(apiURL, apiType, project, issueType string) (*url.URL, error) {
	baseURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	path := strings.TrimSuffix(baseURL.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		version := "2"
		if apiType == "cloud" || (apiType == "auto" && strings.HasSuffix(baseURL.Host, "atlassian.net")) {
			version = "3"
		}
		if apiType == "datacenter" {
			version = "2"
		}
		path = path + "/rest/api/" + version
	} else if apiType == "cloud" && strings.Contains(path, "/rest/api/2") {
		path = strings.Replace(path, "/rest/api/2", "/rest/api/3", 1)
	} else if apiType == "datacenter" && strings.Contains(path, "/rest/api/3") {
		path = strings.Replace(path, "/rest/api/3", "/rest/api/2", 1)
	}

	baseURL.Path = strings.TrimSuffix(path, "/") + "/issue/createmeta"
	query := baseURL.Query()
	query.Set("projectKeys", project)
	query.Set("issuetypeNames", issueType)
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
					ID:            fieldID,
					Name:          field.Name,
					Required:      field.Required,
					SchemaType:    field.Schema.Type,
					SchemaItems:   field.Schema.Items,
					SchemaSystem:  field.Schema.System,
					SchemaCustom:  field.Schema.Custom,
					SchemaCustomID: field.Schema.CustomID,
					AllowedValues: allowedValues,
				})
			}
		}
	}

	sort.Slice(fields, func(i, j int) bool {
		return strings.ToLower(fields[i].Name) < strings.ToLower(fields[j].Name)
	})

	return fields
}

func extractJiraAllowedValues(values []map[string]any) []string {
	if len(values) == 0 {
		return nil
	}

	allowed := make([]string, 0, len(values))
	for _, value := range values {
		for _, key := range []string{"value", "name", "key", "id"} {
			if raw, ok := value[key]; ok {
				if str, ok := raw.(string); ok && str != "" {
					allowed = append(allowed, str)
					break
				}
			}
		}
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

type jiraProjectDetailResponse struct {
	IssueTypes []jiraIssueTypeItem `json:"issueTypes"`
}

type jiraIssueTypeItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func buildJiraProjectsURL(apiURL string) (*url.URL, error) {
	baseURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	path := strings.TrimSuffix(baseURL.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		path = path + "/rest/api/3"
	} else if strings.Contains(path, "/rest/api/2") {
		path = strings.Replace(path, "/rest/api/2", "/rest/api/3", 1)
	}

	baseURL.Path = strings.TrimSuffix(path, "/") + "/project/search"
	query := baseURL.Query()
	query.Set("maxResults", "200")
	baseURL.RawQuery = query.Encode()

	return baseURL, nil
}

func buildJiraProjectIssueTypesURL(apiURL, projectKey string) (*url.URL, error) {
	baseURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid api_url: %v", err)
	}

	path := strings.TrimSuffix(baseURL.Path, "/")
	if !strings.Contains(path, "/rest/api/") {
		path = path + "/rest/api/3"
	} else if strings.Contains(path, "/rest/api/2") {
		path = strings.Replace(path, "/rest/api/2", "/rest/api/3", 1)
	}

	baseURL.Path = strings.TrimSuffix(path, "/") + "/project/" + projectKey
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
	if err := json.Unmarshal(responseBody, &searchResponse); err == nil && len(searchResponse.Values) > 0 {
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
