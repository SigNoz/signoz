export interface JiraConnection {
	id: string;
	cloud_id: string;
	site_url: string;
	createdAt: string;
}

export interface JiraOAuthSession {
	authorize_url: string;
}
