// import getDBOverView from 'api/metrics/getDBOverView';
// import getExternalAverageDuration from 'api/metrics/getExternalAverageDuration';
// import getExternalError from 'api/metrics/getExternalError';
// import getExternalService from 'api/metrics/getExternalService';
import getServiceOverview from 'api/metrics/getServiceOverview';
import getTopEndPoints from 'api/metrics/getTopEndPoints';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Props } from 'types/api/metrics/getDBOverview';

export const GetInitialData = (
	props: GetInitialDataProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'GET_INITIAL_APPLICATION_LOADING',
			});

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
					...props,
				}),
				getTopEndPoints({
					...props,
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

export type GetInitialDataProps = Props;
