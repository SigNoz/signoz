import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import {
	AppAction,
	LOGGED_IN,
	UPDATE_CONFIGS,
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_FEATURE_FLAG_RESPONSE,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
	UPDATE_ORG,
	UPDATE_ORG_NAME,
	UPDATE_USER,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
	UPDATE_USER_FLAG,
	UPDATE_USER_IS_FETCH,
	UPDATE_USER_ORG_ROLE,
} from 'types/actions/app';
import {
	Organization,
	PayloadProps as OrgPayload,
} from 'types/api/user/getOrganization';
import InitialValueTypes, { User } from 'types/reducer/app';

const getInitialUser = (): User | null => {
	const response = getInitialUserTokenRefreshToken();

	if (response) {
		return {
			accessJwt: response.accessJwt,
			refreshJwt: response.refreshJwt,
			userId: '',
			email: '',
			name: '',
			profilePictureURL: '',
		};
	}
	return null;
};

const InitialValue: InitialValueTypes = {
	isLoggedIn: getLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN) === 'true',
	currentVersion: '',
	latestVersion: '',
	featureResponse: {
		data: null,
		refetch: Promise.resolve,
	},
	isCurrentVersionError: false,
	isLatestVersionError: false,
	user: getInitialUser(),
	isUserFetching: true,
	isUserFetchingError: false,
	org: null,
	role: null,
	configs: {},
	userFlags: {},
	ee: 'Y',
	setupCompleted: true,
};

const appReducer = (
	state = InitialValue,
	action: AppAction,
): InitialValueTypes => {
	switch (action.type) {
		case LOGGED_IN: {
			return {
				...state,
				isLoggedIn: action.payload.isLoggedIn,
			};
		}

		case UPDATE_FEATURE_FLAG_RESPONSE: {
			return {
				...state,
				featureResponse: {
					data: action.payload.featureFlag,
					refetch: action.payload.refetch,
				},
			};
		}

		case UPDATE_CURRENT_VERSION: {
			return {
				...state,
				currentVersion: action.payload.currentVersion,
				ee: action.payload.ee,
				setupCompleted: action.payload.setupCompleted,
			};
		}

		case UPDATE_LATEST_VERSION: {
			return { ...state, latestVersion: action.payload.latestVersion };
		}

		case UPDATE_CURRENT_ERROR: {
			return { ...state, isCurrentVersionError: true };
		}

		case UPDATE_LATEST_VERSION_ERROR: {
			return {
				...state,
				isLatestVersionError: true,
			};
		}

		case UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN: {
			return {
				...state,
				user: {
					userId: '',
					email: '',
					name: '',
					profilePictureURL: '',
					...action.payload,
				},
			};
		}

		case UPDATE_USER_IS_FETCH: {
			return {
				...state,
				isUserFetching: action.payload.isUserFetching,
			};
		}

		case UPDATE_USER_ORG_ROLE: {
			return {
				...state,
				...action.payload,
			};
		}

		case UPDATE_USER: {
			const user = state.user || ({} as User);
			const org = state.org || ([] as Organization[]);
			const {
				email,
				name,
				profilePictureURL,
				userId,
				ROLE,
				orgId,
				orgName,
				userFlags,
			} = action.payload;
			const orgIndex = org.findIndex((e) => e.id === orgId);

			const updatedOrg: OrgPayload = [
				...org.slice(0, orgIndex),
				{
					createdAt: 0,
					hasOptedUpdates: false,
					id: orgId,
					isAnonymous: false,
					name: orgName,
				},
				...org.slice(orgIndex + 1, org.length),
			];

			return {
				...state,
				user: {
					...user,
					email,
					name,
					profilePictureURL,
					userId,
				},
				org: [...updatedOrg],
				role: ROLE,
				userFlags,
			};
		}

		case UPDATE_ORG_NAME: {
			const stateOrg = state.org || ({} as OrgPayload);
			const { orgId, name: updatedName } = action.payload;

			const orgIndex = stateOrg.findIndex((e) => e.id === orgId);

			const current = stateOrg[orgIndex];

			const updatedOrg: OrgPayload = [
				...stateOrg.slice(0, orgIndex),
				{
					...current,
					name: updatedName,
				},
				...stateOrg.slice(orgIndex + 1, stateOrg.length),
			];

			return {
				...state,
				org: updatedOrg,
			};
		}

		case UPDATE_ORG: {
			return {
				...state,
				org: action.payload.org,
			};
		}

		case UPDATE_CONFIGS: {
			return {
				...state,
				configs: action.payload.configs,
			};
		}

		case UPDATE_USER_FLAG: {
			return {
				...state,
				userFlags: { ...state.userFlags, ...action.payload.flags },
			};
		}

		default:
			return state;
	}
};

export default appReducer;
