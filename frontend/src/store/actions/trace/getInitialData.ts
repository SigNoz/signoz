import getServiceList from 'api/trace/getServiceList';
import getServiceOperation from 'api/trace/getServiceOperation';
import getSpan from 'api/trace/getSpan';
import getTags from 'api/trace/getTags';
import { AxiosError } from 'axios';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import history from 'lib/history';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps as GetServicePayloadProps } from 'types/api/trace/getServiceOperation';
import { PayloadProps as GetTagsPayloadProps } from 'types/api/trace/getTags';
import { TraceReducer } from 'types/reducer/trace';

export const GetInitialTraceData = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const urlParams = new URLSearchParams(history.location.search.split('?')[1]);

			const operationName = urlParams.get(METRICS_PAGE_QUERY_PARAM.operation);
			const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);
			const errorTag = urlParams.get(METRICS_PAGE_QUERY_PARAM.error);

			const { globalTime, trace } = store.getState();

			const { minTime, maxTime } = globalTime;

			const {
				selectedKind,
				selectedLatency,
				selectedTags,
				selectedOperation,
				selectedService,
			} = trace;

			const [serviceListResponse, spanResponse] = await Promise.all([
				getServiceList(),
				getSpan({
					start: minTime,
					end: maxTime,
					kind: selectedKind,
					limit: '100',
					lookback: '2d',
					maxDuration: selectedLatency.max,
					minDuration: selectedLatency.min,
					operation: selectedOperation,
					service: selectedService,
					tags: JSON.stringify(selectedTags),
				}),
			]);

			let serviceOperationResponse:
				| SuccessResponse<GetServicePayloadProps>
				| ErrorResponse
				| undefined;

			let tagResponse:
				| SuccessResponse<GetTagsPayloadProps>
				| ErrorResponse
				| undefined;

			if (serviceName) {
				[tagResponse, serviceOperationResponse] = await Promise.all([
					getTags({
						service: serviceName,
					}),
					getServiceOperation({
						service: serviceName,
					}),
				]);
			}

			const getSelectedTags = (): TraceReducer['selectedTags'] => {
				if (errorTag) {
					return [
						...selectedTags,
						{
							key: METRICS_PAGE_QUERY_PARAM.error,
							operator: 'equals',
							value: errorTag,
						},
					];
				}
				return [...selectedTags];
			};

			const getCondition = (): boolean => {
				const basicCondition =
					serviceListResponse.statusCode === 200 && spanResponse.statusCode === 200;

				if (serviceName) {
					return (
						tagResponse?.statusCode === 200 &&
						serviceOperationResponse?.statusCode === 200 &&
						basicCondition
					);
				}

				return basicCondition;
			};

			const condition = getCondition();

			if (condition) {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_SUCCESS',
					payload: {
						serviceList: serviceListResponse.payload || [],
						operationList: serviceOperationResponse?.payload || [],
						tagsSuggestions: tagResponse?.payload || [],
						spansList: spanResponse.payload || [],
						selectedService: serviceName || '',
						selectedOperation: operationName || '',
						selectedTags: getSelectedTags(),
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
