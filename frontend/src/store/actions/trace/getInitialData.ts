import getServiceList from 'api/trace/getServiceList';
import getSpan from 'api/trace/getSpan';
import getTags from 'api/trace/getTags';
import { AxiosError } from 'axios';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import history from 'lib/history';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';

export const GetInitialTraceData = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const urlParams = new URLSearchParams(history.location.search.split('?')[1]);

			const operationName = urlParams.get(METRICS_PAGE_QUERY_PARAM.operation);
			const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);
			const errorTag = urlParams.get(METRICS_PAGE_QUERY_PARAM.error);

			const { globalTime } = store.getState();

			dispatch({
				type: 'GET_TRACE_LOADING_START',
			});

			const [serviceListResponse, spanResponse] = await Promise.all([
				getServiceList(),
				getSpan({
					start: globalTime.minTime,
					end: globalTime.maxTime,
					kind: '',
					limit: '100',
					lookback: '2d',
					maxDuration: '',
					minDuration: '',
					operation: '',
					service: '',
				}),
			]);

			let tagResponse = undefined;

			if (serviceName) {
				tagResponse = await getTags({
					service: serviceName,
				});
			}

			if (
				serviceListResponse.statusCode === 200 &&
				spanResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_SUCCESS',
					payload: {
						serviceList: serviceListResponse.payload,
						tags:
							tagResponse?.payload?.map((e) => ({
								key: e.tagKeys,
								value: e.tagCount.toString(),
								operator: 'equals',
							})) || [],
					},
				});
			} else {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_ERROR',
					payload: {
						errorMessage: serviceListResponse?.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_TRACE_INITIAL_DATA_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};
