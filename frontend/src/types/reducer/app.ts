import { PayloadProps as ConfigPayload } from 'types/api/dynamicConfigs/getDynamicConfigs';
import { UserResponse as UserPayload } from 'types/api/user/getUser';

export interface User {
	accessJwt: string;
	refreshJwt: string;
	userId: string;
	email: UserPayload['email'];
	displayName: UserPayload['displayName'];
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
