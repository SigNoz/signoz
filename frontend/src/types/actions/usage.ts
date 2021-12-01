import { PayloadProps as ServicePayload } from 'types/api/metrics/getService';
import { PayloadProps } from 'types/api/usage/getUsage';
import { UsageReducer } from 'types/reducer/usage';

export const GET_INITIAL_USAGE_DATA_LOADING_START =
	'GET_INITIAL_USAGE_DATA_LOADING_START';

export const GET_INITIAL_USAGE_DATA_SUCCESS = 'GET_INITIAL_USAGE_DATA_SUCCESS';
export const GET_INITIAL_USAGE_DATA_ERROR = 'GET_INITIAL_USAGE_DATA_ERROR';
export const UPDATE_SELECTED_SERVICE = 'UPDATE_SELECTED_SERVICE';
export const UPDATE_SELECTED_INTERVAL = 'UPDATE_SELECTED_INTERVAL';
export const UPDATE_SELECTED_TIME = 'UPDATE_SELECTED_TIME';

interface GetInitialUsageDataLoading {
	type: typeof GET_INITIAL_USAGE_DATA_LOADING_START;
	payload: {
		loading: boolean;
	};
}

interface GetInitialUsageDataSuccess {
	type: typeof GET_INITIAL_USAGE_DATA_SUCCESS;
	payload: {
		data: PayloadProps;
		service: ServicePayload;
	};
}

interface GetInitialUsageDataError {
	type: typeof GET_INITIAL_USAGE_DATA_ERROR;
	payload: {
		errorMessage: UsageReducer['errorMessage'];
	};
}

interface UpdateSelectedSelectedService {
	type: typeof UPDATE_SELECTED_SERVICE;
	payload: {
		selectedService: UsageReducer['selectedService'];
	};
}

interface UpdateSelectedInterval {
	type: typeof UPDATE_SELECTED_INTERVAL;
	payload: {
		selectedInterval: UsageReducer['selectedInterval'];
	};
}

interface UpdateSelectedTime {
	type: typeof UPDATE_SELECTED_TIME;
	payload: {
		selectedTime: UsageReducer['selectedTime'];
	};
}

export type UsageActions =
	| GetInitialUsageDataLoading
	| GetInitialUsageDataSuccess
	| GetInitialUsageDataError
	| UpdateSelectedSelectedService
	| UpdateSelectedInterval
	| UpdateSelectedTime;
