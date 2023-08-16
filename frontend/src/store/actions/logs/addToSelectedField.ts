import GetSearchFields from 'api/logs/GetSearchFields';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_FIELDS } from 'types/actions/logs';

export const AddToSelectedField = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => async (dispatch): Promise<void> => {
	const response = await GetSearchFields();
	if (response.payload)
		dispatch({
			type: SET_FIELDS,
			payload: response.payload,
		});
};
