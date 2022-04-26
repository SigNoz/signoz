import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import getTheme from 'lib/theme/getTheme';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import {
	AppAction,
	LOGGED_IN,
	SIDEBAR_COLLAPSE,
	SWITCH_DARK_MODE,
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
	UPDATE_USER,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
	UPDATE_USER_IS_FETCH,
	UPDATE_USER_ORG_ROLE,
} from 'types/actions/app';
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
	isDarkMode: getTheme() === 'darkMode',
	isLoggedIn: getLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN) === 'true',
	isSideBarCollapsed: getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	currentVersion: '',
	latestVersion: '',
	isCurrentVersionError: false,
	isLatestVersionError: false,
	user: getInitialUser(),
	isUserFetching: true,
	isUserFetchingError: false,
	org: null,
	role: null,
};

const appReducer = (
	state = InitialValue,
	action: AppAction,
): InitialValueTypes => {
	switch (action.type) {
		case SWITCH_DARK_MODE: {
			return {
				...state,
				isDarkMode: !state.isDarkMode,
			};
		}

		case LOGGED_IN: {
			return {
				...state,
				isLoggedIn: action.payload.isLoggedIn,
			};
		}

		case SIDEBAR_COLLAPSE: {
			return {
				...state,
				isSideBarCollapsed: action.payload,
			};
		}

		case UPDATE_CURRENT_VERSION: {
			return {
				...state,
				currentVersion: action.payload.currentVersion,
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
			return {
				...state,
				user: {
					...user,
					...action.payload,
				},
			};
		}

		default:
			return state;
	}
};

export default appReducer;
