import { OrgPreference } from 'types/reducer/app';

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
	data: OrgPreference[];
}

export interface GetAllUserPreferencesResponseProps {
	status: string;
	data: Record<string, unknown>;
}

export interface UpdateOrgPreferenceProps {
	preferenceID: string;
	value: unknown;
}

export interface UpdateUserPreferenceProps {
	preferenceID: string;
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
