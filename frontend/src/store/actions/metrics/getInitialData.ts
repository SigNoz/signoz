// import getDBOverView from 'api/metrics/getDBOverView';
// import getExternalAverageDuration from 'api/metrics/getExternalAverageDuration';
// import getExternalError from 'api/metrics/getExternalError';
// import getExternalService from 'api/metrics/getExternalService';
import getServiceOverview from 'api/metrics/getServiceOverview';
import getTopEndPoints from 'api/metrics/getTopEndPoints';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Props } from 'types/api/metrics/getDBOverview';
import { GlobalReducer } from 'types/reducer/globalTime';

export const GetInitialData = (
	props: GetInitialDataProps,
): ((dispatch: Dispatch<AppActions>, getState: () => AppState) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const { globalTime } = getState();

			/**
			 * @description This is because we keeping the store as source of truth
			 */
			if (
				props.maxTime !== globalTime.maxTime &&
				props.minTime !== globalTime.minTime
			) {
				return;
			}

			dispatch({
				type: 'GET_INITIAL_APPLICATION_LOADING',
			});

			const { maxTime, minTime } = GetMinMax(globalTime.selectedTime, [
				globalTime.minTime / 1000000,
				globalTime.maxTime / 1000000,
			]);

			const step = 60;

			const [
				// getDBOverViewResponse,
				// getExternalAverageDurationResponse,
				// getExternalErrorResponse,
				// getExternalServiceResponse,
				getServiceOverviewResponse,
				getTopEndPointsResponse,
			] = await Promise.all([
				// getDBOverView({
				// 	...props,
				// }),
				// getExternalAverageDuration({
				// 	...props,
				// }),
				// getExternalError({
				// 	...props,
				// }),
				// getExternalService({
				// 	...props,
				// }),
				getServiceOverview({
					end: maxTime,
					service: props.serviceName,
					start: minTime,
					step,
				}),
				getTopEndPoints({
					end: maxTime,
					service: props.serviceName,
					start: minTime,
				}),
			]);

			if (
				// getDBOverViewResponse.statusCode === 200 &&
				// getExternalAverageDurationResponse.statusCode === 200 &&
				// getExternalErrorResponse.statusCode === 200 &&
				// getExternalServiceResponse.statusCode === 200 &&
				getServiceOverviewResponse.statusCode === 200 &&
				getTopEndPointsResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INTIAL_APPLICATION_DATA',
					payload: {
						// dbOverView: getDBOverViewResponse.payload,
						// externalAverageDuration: getExternalAverageDurationResponse.payload,
						// externalError: getExternalErrorResponse.payload,
						// externalService: getExternalServiceResponse.payload,
						serviceOverview: getServiceOverviewResponse.payload,
						topEndPoints: getTopEndPointsResponse.payload,
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_APPLICATION_ERROR',
					payload: {
						errorMessage:
							getTopEndPointsResponse.error ||
							getServiceOverviewResponse.error ||
							// getExternalServiceResponse.error ||
							// getExternalErrorResponse.error ||
							// getExternalAverageDurationResponse.error ||
							// getDBOverViewResponse.error ||
							'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_INITIAL_APPLICATION_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface GetInitialDataProps {
	serviceName: Props['service'];
	maxTime: GlobalReducer['maxTime'];
	minTime: GlobalReducer['minTime'];
}
