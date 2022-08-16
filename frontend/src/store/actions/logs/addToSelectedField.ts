import GetSearchFields from 'api/logs/GetSearchFields';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { GET_FIELDS, SET_FIELDS } from 'types/actions/logs';
import { TraceReducer } from 'types/reducer/trace';

export const AddToSelectedField = (): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch): void => {
		const response = await GetSearchFields();

		dispatch({
			type: SET_FIELDS,
			payload: response.payload,
		});
	};
};
