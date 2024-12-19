import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

export const GetService = (
	props: GetServiceProps,
): ((
	dispatch: Dispatch<AppActions>,
	getState: () => AppState,
) => void) => async (dispatch, getState): Promise<void> => {
	try {
		const { globalTime } = getState();

		const { maxTime, minTime } = GetMinMax(globalTime.selectedTime, [
			globalTime.minTime / 1000000,
			globalTime.maxTime / 1000000,
		]);

		dispatch({
			type: 'GET_SERVICE_LIST_LOADING_START',
		});

		const response = await getService({
			end: maxTime,
			start: minTime,
			selectedTags: props.selectedTags,
		});

		if (response.length > 0) {
			dispatch({
				type: 'GET_SERVICE_LIST_SUCCESS',
				payload: response,
			});
		} else {
			dispatch({
				type: 'GET_SERVICE_LIST_ERROR',
				payload: {
					errorMessage: SOMETHING_WENT_WRONG,
				},
			});
		}
	} catch (error) {
		dispatch({
			type: 'GET_SERVICE_LIST_ERROR',
			payload: {
				errorMessage: (error as AxiosError).toString() || SOMETHING_WENT_WRONG,
			},
		});
	}
};

export type GetServiceProps = {
	minTime: GlobalReducer['minTime'];
	maxTime: GlobalReducer['maxTime'];
	selectedTags: Tags[];
};
