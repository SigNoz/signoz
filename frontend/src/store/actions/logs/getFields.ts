import GetSearchFields from 'api/logs/GetSearchFields';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { GET_FIELDS, SET_FIELDS } from 'types/actions/logs';
import { TraceReducer } from 'types/reducer/trace';

const IGNORED_SELECTED_FIELDS = ['timestamp'];

export const GetLogsFields = (): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch): void => {
		const response = await GetSearchFields();
		if (response.payload) {
			dispatch({
				type: SET_FIELDS,
				payload: {
					interesting: response.payload.interesting,
					selected: response.payload.selected.filter(
						(field) => !IGNORED_SELECTED_FIELDS.includes(field.name),
					),
				},
			});
		}
	};
};
