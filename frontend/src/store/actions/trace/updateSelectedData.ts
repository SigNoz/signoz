import getServiceOperation from 'api/trace/getServiceOperation';
import getSpan from 'api/trace/getSpan';
import getTags from 'api/trace/getTags';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps as ServiceOperationPayloadProps } from 'types/api/trace/getServiceOperation';
import { PayloadProps as TagPayloadProps } from 'types/api/trace/getTags';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSelectedData = ({
	selectedKind,
	selectedService,
	selectedLatency,
	selectedOperation,
}: UpdateSelectedDataProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { trace, globalTime } = store.getState();
			const { minTime, maxTime } = globalTime;

			const { selectedTags } = trace;

			const [spanResponse] = await Promise.all([
				getSpan({
					start: minTime,
					end: maxTime,
					kind: selectedKind || '',
					limit: '100',
					lookback: '2d',
					maxDuration: selectedLatency.max || '',
					minDuration: selectedLatency.min || '',
					operation: selectedOperation || '',
					service: selectedService || '',
					tags: JSON.stringify(selectedTags),
				}),
			]);

			let tagResponse:
				| SuccessResponse<TagPayloadProps>
				| ErrorResponse
				| undefined;

			let serviceOperationResponse:
				| SuccessResponse<ServiceOperationPayloadProps>
				| ErrorResponse
				| undefined;

			if (selectedService !== null && selectedService.length !== 0) {
				[tagResponse, serviceOperationResponse] = await Promise.all([
					getTags({
						service: selectedService,
					}),
					getServiceOperation({
						service: selectedService,
					}),
				]);
			}

			const getCondition = (): boolean => {
				const basicCondition = spanResponse.statusCode === 200;

				if (selectedService === null || selectedService.length === 0) {
					return basicCondition;
				}

				return (
					basicCondition &&
					tagResponse?.statusCode === 200 &&
					serviceOperationResponse?.statusCode === 200
				);
			};

			const condition = getCondition();

			if (condition) {
				dispatch({
					type: 'UPDATE_SELECTED_TRACE_DATA',
					payload: {
						operationList: serviceOperationResponse?.payload || [],
						spansList: spanResponse.payload || [],
						tagsSuggestions: tagResponse?.payload || [],
						selectedKind,
						selectedService,
						selectedLatency,
						selectedOperation,
					},
				});
			} else {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_ERROR',
					payload: {
						errorMessage: 'Something went wrong',
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

export interface UpdateSelectedDataProps {
	selectedKind: TraceReducer['selectedKind'];
	selectedService: TraceReducer['selectedService'];
	selectedLatency: TraceReducer['selectedLatency'];
	selectedOperation: TraceReducer['selectedOperation'];
}
