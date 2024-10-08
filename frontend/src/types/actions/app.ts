import { QueryObserverBaseResult } from 'react-query';
import { PayloadProps as FeatureFlagPayload } from 'types/api/features/getFeaturesFlags';
import {
	Organization,
	PayloadProps as OrgPayload,
} from 'types/api/user/getOrganization';
import { UserFlags } from 'types/api/user/setFlags';
import AppReducer, { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export const LOGGED_IN = 'LOGGED_IN';
export const SIDEBAR_COLLAPSE = 'SIDEBAR_COLLAPSE';

export const UPDATE_CURRENT_VERSION = 'UPDATE_CURRENT_VERSION';
export const UPDATE_LATEST_VERSION = 'UPDATE_LATEST_VERSION';

export const UPDATE_CURRENT_ERROR = 'UPDATE_CURRENT_ERROR';
export const UPDATE_LATEST_VERSION_ERROR = 'UPDATE_LATEST_VERSION_ERROR';
export const UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN =
	'UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN';
export const UPDATE_USER_IS_FETCH = 'UPDATE_USER_IS_FETCH';
export const UPDATE_USER_ORG_ROLE = 'UPDATE_USER_ORG_ROLE';
export const UPDATE_USER = 'UPDATE_USER';
export const UPDATE_ORG_NAME = 'UPDATE_ORG_NAME';
export const UPDATE_ORG = 'UPDATE_ORG';
export const UPDATE_CONFIGS = 'UPDATE_CONFIGS';
export const UPDATE_USER_FLAG = 'UPDATE_USER_FLAG';
export const UPDATE_FEATURE_FLAG_RESPONSE = 'UPDATE_FEATURE_FLAG_RESPONSE';

export interface LoggedInUser {
	type: typeof LOGGED_IN;
	payload: {
		isLoggedIn: boolean;
	};
}

export interface UpdateAppVersion {
	type: typeof UPDATE_CURRENT_VERSION;
	payload: {
		currentVersion: AppReducer['currentVersion'];
		ee: AppReducer['ee'];
		setupCompleted: AppReducer['setupCompleted'];
	};
}

export interface UpdateLatestVersion {
	type: typeof UPDATE_LATEST_VERSION;
	payload: {
		latestVersion: AppReducer['latestVersion'];
	};
}

export interface UpdateVersionError {
	type: typeof UPDATE_CURRENT_ERROR | typeof UPDATE_LATEST_VERSION_ERROR;
	payload: {
		isError: boolean;
	};
}

export interface UpdateUserOrgRole {
	type: typeof UPDATE_USER_ORG_ROLE;
	payload: {
		role: ROLES | null;
		org: OrgPayload | null;
	};
}

export interface UpdateAccessRenewToken {
	type: typeof UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN;
	payload: {
		accessJwt: User['accessJwt'];
		refreshJwt: User['refreshJwt'];
	};
}

export interface UpdateUser {
	type: typeof UPDATE_USER;
	payload: {
		email: User['email'];
		name: User['name'];
		profilePictureURL: User['profilePictureURL'];
		userId: User['userId'];
		orgName: Organization['name'];
		ROLE: ROLES;
		orgId: Organization['id'];
		userFlags: UserFlags;
	};
}

export interface UpdateUserIsFetched {
	type: typeof UPDATE_USER_IS_FETCH;
	payload: {
		isUserFetching: AppReducer['isUserFetching'];
	};
}

export interface UpdateOrgName {
	type: typeof UPDATE_ORG_NAME;
	payload: {
		name: string;
		orgId: string;
	};
}

export interface UpdateUserFlag {
	type: typeof UPDATE_USER_FLAG;
	payload: {
		flags: UserFlags | null;
	};
}

export interface UpdateOrg {
	type: typeof UPDATE_ORG;
	payload: {
		org: AppReducer['org'];
	};
}
export interface UpdateConfigs {
	type: typeof UPDATE_CONFIGS;
	payload: {
		configs: AppReducer['configs'];
	};
}

export interface UpdateFeatureFlag {
	type: typeof UPDATE_FEATURE_FLAG_RESPONSE;
	payload: {
		featureFlag: FeatureFlagPayload;
		refetch: QueryObserverBaseResult['refetch'];
	};
}

export type AppAction =
	| LoggedInUser
	| UpdateAppVersion
	| UpdateLatestVersion
	| UpdateVersionError
	| UpdateAccessRenewToken
	| UpdateUserIsFetched
	| UpdateUserOrgRole
	| UpdateUser
	| UpdateOrgName
	| UpdateOrg
	| UpdateConfigs
	| UpdateUserFlag
	| UpdateFeatureFlag;
