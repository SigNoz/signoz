export interface JiraProjectsRequest {
	api_url: string;
	username: string;
	password: string;
}

export interface JiraProject {
	id: string;
	key: string;
	name: string;
}

export interface JiraProjectsResponse {
	projects: JiraProject[];
}

export interface JiraProjectIssueTypesRequest {
	api_url: string;
	username: string;
	password: string;
	project_key: string;
}

export interface JiraIssueType {
	id: string;
	name: string;
}

export interface JiraProjectIssueTypesResponse {
	project_key: string;
	issue_types: JiraIssueType[];
}
