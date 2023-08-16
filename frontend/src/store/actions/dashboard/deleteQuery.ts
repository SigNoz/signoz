import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { DeleteQueryProps } from 'types/actions/dashboard';

export const DeleteQuery = (
	props: DeleteQueryProps,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'DELETE_QUERY',
		payload: {
			currentIndex: props.currentIndex,
			widgetId: props.widgetId,
		},
	});
};
