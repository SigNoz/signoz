import { PayloadProps as ConfigPayload } from 'types/api/dynamicConfigs/getDynamicConfigs';
import { UserResponse } from 'types/api/user/crud/get';

export interface User {
	accessJwt: string;
	refreshJwt: string;
	userId: string;
	email: UserResponse['email'];
	displayName: UserResponse['displayName'];
}

export interface OrgPreference {
	key: string;
	name: string;
	description: string;
	valueType: string;
	defaultValue: boolean;
	allowedValues: any[];
	isDiscreteValues: boolean;
	allowedScopes: string[];
	value: boolean;
}

export interface UserPreference {
	key: string;
	name: string;
	description: string;
	valueType: string;
	defaultValue: boolean;
	allowedValues: any[];
	isDiscreteValues: boolean;
	allowedScopes: string[];
	value: boolean;
}

export default interface AppReducer {
	currentVersion: string;
	latestVersion: string;
	isCurrentVersionError: boolean;
	isLatestVersionError: boolean;
	configs: ConfigPayload;
	ee: 'Y' | 'N';
	setupCompleted: boolean;
}
