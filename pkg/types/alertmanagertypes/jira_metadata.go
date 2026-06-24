package alertmanagertypes

type JiraMetadataRequest struct {
	APIURL    string `json:"api_url"`
	APIType   string `json:"api_type"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Project   string `json:"project"`
	IssueType string `json:"issue_type"`
}

type JiraFieldMetadata struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Required       bool     `json:"required"`
	SchemaType     string   `json:"schema_type,omitempty"`
	SchemaItems    string   `json:"schema_items,omitempty"`
	SchemaSystem   string   `json:"schema_system,omitempty"`
	SchemaCustom   string   `json:"schema_custom,omitempty"`
	SchemaCustomID int      `json:"schema_custom_id,omitempty"`
	AllowedValues  []string `json:"allowed_values,omitempty"`
}

type JiraMetadataResponse struct {
	Project   string              `json:"project"`
	IssueType string              `json:"issue_type"`
	Fields    []JiraFieldMetadata `json:"fields"`
}
