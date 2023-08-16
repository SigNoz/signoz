import GetLogsAggregate from 'api/logs/GetLogsAggregate';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import {
	SET_LOADING_AGGREGATE,
	SET_LOGS_AGGREGATE_SERIES,
} from 'types/actions/logs';
import { Props } from 'types/api/logs/getLogsAggregate';
import { ILogsAggregate } from 'types/api/logs/logAggregate';

export const getLogsAggregate = (
	props: Props,
): ((dispatch: Dispatch<AppActions>) => void) => async (
	dispatch,
): Promise<void> => {
	dispatch({
		type: SET_LOADING_AGGREGATE,
		payload: true,
	});

	const response = await GetLogsAggregate(props);
	if (response.payload) {
		const convertedArray: ILogsAggregate[] = Object.values(
			response.payload,
		).map((data) => ({ ...data, time: new Date(data.timestamp / 1e6) }));

		dispatch({
			type: SET_LOGS_AGGREGATE_SERIES,
			payload: convertedArray,
		});
	} else {
		dispatch({
			type: SET_LOGS_AGGREGATE_SERIES,
			payload: [],
		});
	}

	dispatch({
		type: SET_LOADING_AGGREGATE,
		payload: false,
	});
};
