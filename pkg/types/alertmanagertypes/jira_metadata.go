package alertmanagertypes

type JiraMetadataRequest struct {
	ConnectionID string `json:"connection_id"`
	Project      string `json:"project"`
	IssueType    string `json:"issue_type"`
}

type JiraAllowedValue struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type JiraFieldMetadata struct {
	ID             string             `json:"id"`
	Name           string             `json:"name"`
	Required       bool               `json:"required"`
	SchemaType     string             `json:"schema_type,omitempty"`
	SchemaItems    string             `json:"schema_items,omitempty"`
	SchemaSystem   string             `json:"schema_system,omitempty"`
	SchemaCustom   string             `json:"schema_custom,omitempty"`
	SchemaCustomID int                `json:"schema_custom_id,omitempty"`
	AllowedValues  []JiraAllowedValue `json:"allowed_values,omitempty"`
}

type JiraMetadataResponse struct {
	Project   string              `json:"project"`
	IssueType string              `json:"issue_type"`
	Fields    []JiraFieldMetadata `json:"fields"`
}
