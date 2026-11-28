export enum AuditOutcome {
	SUCCESS = 'success',
	FAILURE = 'failure',
}

export enum AuditPrincipalType {
	USER = 'user',
	SERVICE_ACCOUNT = 'service_account',
	SYSTEM = 'system',
	ANONYMOUS = 'anonymous',
}

export interface AuditLogAttributes {
	'signoz.audit.action_category': string;
	'signoz.audit.outcome': AuditOutcome;
	'signoz.audit.verb': string;
	'signoz.organization.id': string;
	'signoz.principal.id'?: string;
	'signoz.principal.type'?: AuditPrincipalType;
	'signoz.principal.email'?: string;
	'signoz.principal.identn.provider'?: string;
	'client.address'?: string;
	'http.request.method'?: string;
	'http.response.status_code'?: number;
	'http.route'?: string;
	'network.protocol.name'?: string;
	'network.protocol.version'?: string;
	'url.path'?: string;
	'url.scheme'?: string;
	'user_agent.original'?: string;
}

export interface AuditLogResourceAttributes {
	'service.name': string;
	'service.version'?: string;
	'signoz.resource.id'?: string;
	'signoz.resource.kind'?: string;
	'signoz.resource.object'?: string;
}

export interface AuditLogData {
	id: string;
	timestamp: number;
	body: { message: string };
	event_name: string;
	severity_number: number;
	severity_text: string;
	trace_id: string;
	span_id: string;
	trace_flags: number;
	attributes: AuditLogAttributes;
	resource: { attributes: AuditLogResourceAttributes };
	scope: {
		name: string;
		version: string;
		attributes: Record<string, string>;
	};
}

export interface AuditLogRow {
	data: AuditLogData;
	timestamp: string;
}

export interface AuditLogsQueryResult {
	queryName: string;
	nextCursor: string;
	rows: AuditLogRow[];
}

export interface AuditLogsResponse {
	type: 'raw';
	meta: {
		rowsScanned: number;
		bytesScanned: number;
		durationMs: number;
		stepIntervals: Record<string, number>;
	};
	data: { results: AuditLogsQueryResult[] };
}

export type AuditLog = Omit<AuditLogData, 'body'> & {
	body: string;
	date: string;
};

export enum AuditLogsColumnIds {
	OUTCOME_INDICATOR = 'outcome-indicator',
	TIME = 'time',
	PRINCIPAL_EMAIL = 'principal-email',
	EVENT_NAME = 'event-name',
	RESOURCE_NAME = 'resource-name',
	RESOURCE_ID = 'resource-id',
	OUTCOME = 'outcome',
	BODY = 'body',
}
