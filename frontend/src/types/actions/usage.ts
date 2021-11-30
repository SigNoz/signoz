import { PayloadProps as ServicePayload } from 'types/api/metrics/getService';
import { PayloadProps } from 'types/api/usage/getUsage';
import { GlobalReducer } from 'types/reducer/globalTime';
import { UsageReducer } from 'types/reducer/usage';

export const GET_INITIAL_USAGE_DATA = 'GET_INITIAL_USAGE_DATA';
export const GET_INITIAL_USAGE_DATA_SUCCESS = 'GET_INITIAL_USAGE_DATA_SUCCESS';
export const GET_INITIAL_USAGE_DATA_ERROR = 'GET_INITIAL_USAGE_DATA_ERROR';
export const UPDATE_SELECTED_SERVICE = 'UPDATE_SELECTED_SERVICE';

interface GetInitialUsageData {
	type: typeof GET_INITIAL_USAGE_DATA;
	payload: {
		selectedTime: GlobalReducer['selectedTime'];
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

export type UsageActions =
	| GetInitialUsageData
	| GetInitialUsageDataSuccess
	| GetInitialUsageDataError
	| UpdateSelectedSelectedService;
