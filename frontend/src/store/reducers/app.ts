import { IS_LOGGED_IN } from 'constants/auth';
import {
	AppAction,
	LOGGED_IN,
	SWITCH_DARK_MODE,
	TOGGLE_SETTINGS_TABS,
} from 'types/actions/app';
import InitialValueTypes from 'types/reducer/app';
import getLocalStorageKey from 'api/browser/localstorage/get';

const InitialValue: InitialValueTypes = {
	isDarkMode: true,
	isLoggedIn: getLocalStorageKey(IS_LOGGED_IN) === 'yes',
	settingsActiveTab: 'General',
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

		case TOGGLE_SETTINGS_TABS: {
			return {
				...state,
				settingsActiveTab: action.payload.activeTab,
			};
		}

		default:
			return state;
	}
};

export default appReducer;
