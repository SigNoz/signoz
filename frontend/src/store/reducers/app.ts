import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { IS_LOGGED_IN } from 'constants/auth';
import getTheme from 'lib/theme/getTheme';
import {
	AppAction,
	LOGGED_IN,
	SIDEBAR_COLLAPSE,
	SWITCH_DARK_MODE,
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import InitialValueTypes from 'types/reducer/app';

const InitialValue: InitialValueTypes = {
	isDarkMode: getTheme() === 'darkMode',
	isLoggedIn: getLocalStorageKey(IS_LOGGED_IN) === 'yes',
	isSideBarCollapsed: getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	currentVersion: '',
	latestVersion: '',
	isCurrentVersionError: false,
	isLatestVersionError: false,
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
				isLoggedIn: true,
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

		default:
			return state;
	}
};

export default appReducer;
