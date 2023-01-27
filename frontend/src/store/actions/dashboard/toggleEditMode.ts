import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const ToggleEditMode = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => (dispatch: Dispatch<AppActions>): void => {
	dispatch({
		type: 'TOGGLE_EDIT_MODE',
	});
};
