import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const CreateQuery = ({ widgetId }: CreateQueryProps) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'CREATE_NEW_QUERY',
		payload: {
			widgetId,
		},
	});
};

export interface CreateQueryProps {
	widgetId: string;
}
