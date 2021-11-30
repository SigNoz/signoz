import getService from 'api/metrics/getService';
import getUsage from 'api/usage/getUsage';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { UsageReducer } from 'types/reducer/usage';

export const GetInitialUsageData = ({
	selectedTime,
	selectedService,
	step,
}: GetInitialUsageDataProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { globalTime } = store.getState();

			//taking redux as source of truth
			if (globalTime.selectedTime !== selectedTime) {
				return;
			}

			const { maxTime, minTime } = GetMinMax(selectedTime, [
				globalTime.minTime / 1000000,
				globalTime.maxTime / 1000000,
			]);

			const [getServiceResponse, getUsageResponse] = await Promise.all([
				getService({
					end: maxTime,
					start: minTime,
				}),
				getUsage({
					maxTime,
					minTime,
					service: selectedService,
					step,
				}),
			]);

			if (
				getServiceResponse.statusCode === 200 &&
				getUsageResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INITIAL_USAGE_DATA_SUCCESS',
					payload: {
						data: getUsageResponse.payload,
						service: getServiceResponse.payload,
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_USAGE_DATA_ERROR',
					payload: {
						errorMessage:
							getUsageResponse.error ||
							getServiceResponse.error ||
							'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_INITIAL_USAGE_DATA_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface GetInitialUsageDataProps {
	selectedTime: GlobalReducer['selectedTime'];
	selectedService: UsageReducer['selectedService'];
	step: UsageReducer['step'];
}
