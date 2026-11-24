import AppReducer from 'types/reducer/app';

export const UPDATE_CURRENT_VERSION = 'UPDATE_CURRENT_VERSION';
export const UPDATE_LATEST_VERSION = 'UPDATE_LATEST_VERSION';
export const UPDATE_CURRENT_ERROR = 'UPDATE_CURRENT_ERROR';
export const UPDATE_LATEST_VERSION_ERROR = 'UPDATE_LATEST_VERSION_ERROR';
export const UPDATE_CONFIGS = 'UPDATE_CONFIGS';

interface UpdateAppVersion {
	type: typeof UPDATE_CURRENT_VERSION;
	payload: {
		currentVersion: AppReducer['currentVersion'];
		ee: AppReducer['ee'];
		setupCompleted: AppReducer['setupCompleted'];
	};
}

interface UpdateLatestVersion {
	type: typeof UPDATE_LATEST_VERSION;
	payload: {
		latestVersion: AppReducer['latestVersion'];
	};
}

interface UpdateVersionError {
	type: typeof UPDATE_CURRENT_ERROR | typeof UPDATE_LATEST_VERSION_ERROR;
	payload: {
		isError: boolean;
	};
}

interface UpdateConfigs {
	type: typeof UPDATE_CONFIGS;
	payload: {
		configs: AppReducer['configs'];
	};
}

export type AppAction =
	| UpdateAppVersion
	| UpdateLatestVersion
	| UpdateVersionError
	| UpdateConfigs;
