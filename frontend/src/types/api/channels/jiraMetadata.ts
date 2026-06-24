export interface JiraMetadataRequest {
	api_url: string;
	api_type?: string;
	username: string;
	password: string;
	project: string;
	issue_type: string;
}

export interface JiraFieldMetadata {
	id: string;
	name: string;
	required: boolean;
	schema_type?: string;
	schema_items?: string;
	schema_system?: string;
	schema_custom?: string;
	schema_custom_id?: number;
	allowed_values?: string[];
}

export interface JiraMetadataResponse {
	project: string;
	issue_type: string;
	fields: JiraFieldMetadata[];
}
