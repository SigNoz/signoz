import {
	AppAction,
	UPDATE_CONFIGS,
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import InitialValueTypes from 'types/reducer/app';

const InitialValue: InitialValueTypes = {
	currentVersion: '',
	latestVersion: '',
	isCurrentVersionError: false,
	isLatestVersionError: false,
	configs: {},
	ee: 'Y',
	setupCompleted: true,
};

const appReducer = (
	state = InitialValue,
	action: AppAction,
): InitialValueTypes => {
	switch (action.type) {
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
		case UPDATE_CONFIGS: {
			return {
				...state,
				configs: action.payload.configs,
			};
		}
		default:
			return state;
	}
};

export default appReducer;
