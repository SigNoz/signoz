export interface GetOrgPreferenceResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface GetUserPreferenceResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface GetAllOrgPreferencesResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface GetAllUserPreferencesResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface UpdateOrgPreferenceProps {
	key: string;
	value: unknown;
}

export interface UpdateUserPreferenceProps {
	key: string;
	value: unknown;
}

export interface UpdateOrgPreferenceResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface UpdateUserPreferenceResponseProps {
	status: string;
	data: Record<string, unknown>;
}
