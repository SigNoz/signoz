export interface OrgPreference {
	name: string;
	description: string;
	valueType: string;
	defaultValue: boolean;
	allowedValues: string[];
	allowedScopes: string[];
	value: boolean;
}

export interface UserPreference {
	name: string;
	description: string;
	valueType: string;
	defaultValue: boolean;
	allowedValues: string[];
	allowedScopes: string[];
	value: boolean;
}
