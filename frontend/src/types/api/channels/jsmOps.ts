export interface JsmOpsConnection {
	id: string;
	cloud_id: string;
	site_url: string;
	createdAt: string;
}

export interface JsmOpsTeam {
	id: string;
	name: string;
}

export interface JsmOpsOAuthSession {
	authorize_url: string;
}
