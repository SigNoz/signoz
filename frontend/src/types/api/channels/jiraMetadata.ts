export interface JiraMetadataRequest {
	connection_id: string;
	project: string;
	issue_type: string;
}

export interface JiraAllowedValue {
	label: string;
	value: string;
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
	allowed_values?: JiraAllowedValue[];
}

export interface JiraMetadataResponse {
	project: string;
	issue_type: string;
	fields: JiraFieldMetadata[];
}
