import { PayloadProps as OrgPayload } from 'types/api/user/getOrganization';
import { ROLES } from 'types/roles';

export interface User {
	accessJwt: string;
	refreshJwt: string;
	userId: string;
}

export default interface AppReducer {
	isDarkMode: boolean;
	isLoggedIn: boolean;
	isSideBarCollapsed: boolean;
	currentVersion: string;
	latestVersion: string;
	isCurrentVersionError: boolean;
	isLatestVersionError: boolean;
	user: null | User;
	isUserFetching: boolean;
	isUserFetchingError: boolean;
	role: ROLES | null;
	org: OrgPayload | null;
}
