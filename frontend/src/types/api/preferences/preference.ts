export interface OrgPreference {
	name: string;
	description: string;
	valueType: string;
	defaultValue: unknown;
	allowedValues: string[];
	allowedScopes: string[];
	value: unknown;
}

export interface UserPreference {
	name: string;
	description: string;
	valueType: string;
	defaultValue: unknown;
	allowedValues: string[];
	allowedScopes: string[];
	value: unknown;
}
