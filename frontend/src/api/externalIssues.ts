import axios from 'axios';

export interface ExternalIssue {
	id: string;
	alertFingerprint: number;
	ruleId: string;
	ruleName: string;
	externalSystem: 'jira' | 'github';
	externalIssueId: string;
	externalIssueUrl: string;
	syncStatus: 'synced' | 'pending' | 'error';
	lastSyncedAt: string;
	syncError?: string;
	metadata: Record<string, any>;
	createdAt: string;
	updatedAt: string;
	orgId: string;
}

export interface ExternalIssueListResponse {
	items: ExternalIssue[];
	total: number;
}

export interface CreateExternalIssueRequest {
	alertFingerprint: number;
	ruleId: string;
	externalSystem: 'jira' | 'github';
	externalIssueId: string;
	externalIssueUrl: string;
	metadata?: Record<string, any>;
}

export interface UpdateExternalIssueRequest {
	syncStatus?: 'synced' | 'pending' | 'error';
	syncError?: string;
	metadata?: Record<string, any>;
}

export interface QueryExternalIssuesParams {
	ruleId?: string;
	externalSystem?: 'jira' | 'github';
	syncStatus?: 'synced' | 'pending' | 'error';
	limit?: number;
	offset?: number;
}

export const externalIssuesApi = {
	// List all external issues with optional filters
	list: async (params?: QueryExternalIssuesParams): Promise<ExternalIssueListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.ruleId) queryParams.append('ruleId', params.ruleId);
		if (params?.externalSystem) queryParams.append('externalSystem', params.externalSystem);
		if (params?.syncStatus) queryParams.append('syncStatus', params.syncStatus);
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		if (params?.offset) queryParams.append('offset', params.offset.toString());

		const response = await axios.get(`/api/v1/external-issues?${queryParams.toString()}`);
		return response.data;
	},

	// Get a single external issue by ID
	get: async (id: string): Promise<ExternalIssue> => {
		const response = await axios.get(`/api/v1/external-issues/${id}`);
		return response.data;
	},

	// Get external issues by alert fingerprint
	getByAlert: async (fingerprint: number): Promise<ExternalIssueListResponse> => {
		const response = await axios.get(`/api/v1/alerts/${fingerprint}/external-issues`);
		return response.data;
	},

	// Get external issues by rule ID
	getByRule: async (ruleId: string): Promise<ExternalIssueListResponse> => {
		const response = await axios.get(`/api/v1/rules/${ruleId}/external-issues`);
		return response.data;
	},

	// Create a new external issue mapping
	create: async (data: CreateExternalIssueRequest): Promise<ExternalIssue> => {
		const response = await axios.post('/api/v1/external-issues', data);
		return response.data;
	},

	// Update an external issue
	update: async (id: string, data: UpdateExternalIssueRequest): Promise<void> => {
		await axios.put(`/api/v1/external-issues/${id}`, data);
	},

	// Delete an external issue mapping
	delete: async (id: string): Promise<void> => {
		await axios.delete(`/api/v1/external-issues/${id}`);
	},
};
