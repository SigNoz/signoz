package alertmanagertypes

type JiraProjectsRequest struct {
	APIURL   string `json:"api_url"`
	Username string `json:"username"`
	Password string `json:"password"`
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
	APIURL     string `json:"api_url"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	ProjectKey string `json:"project_key"`
}

type JiraIssueType struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type JiraProjectIssueTypesResponse struct {
	ProjectKey string          `json:"project_key"`
	IssueTypes []JiraIssueType `json:"issue_types"`
}
