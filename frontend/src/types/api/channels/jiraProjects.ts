export interface JiraProjectsRequest {
	connection_id: string;
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
	connection_id: string;
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

export interface JiraUsersRequest {
	connection_id: string;
	project_key: string;
	query?: string;
}

export interface JiraUser {
	account_id: string;
	display_name: string;
	email_address: string;
	active: boolean;
}

export interface JiraUsersResponse {
	users: JiraUser[];
}
