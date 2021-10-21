import { Dispatch } from 'react';
import AppActions from 'types/actions';

export const ToggleEditMode = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'TOGGLE_EDIT_MODE',
		});
	};
};
