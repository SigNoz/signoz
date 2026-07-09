package alertmanagertypes

type JiraProjectsRequest struct {
	ConnectionID string `json:"connection_id"`
}

type JiraProject struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

type JiraProjectsResponse struct {
	Projects []JiraProject `json:"projects"`
}

type JiraProjectIssueTypesRequest struct {
	ConnectionID string `json:"connection_id"`
	ProjectKey   string `json:"project_key"`
}

type JiraIssueType struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type JiraProjectIssueTypesResponse struct {
	ProjectKey string          `json:"project_key"`
	IssueTypes []JiraIssueType `json:"issue_types"`
}
