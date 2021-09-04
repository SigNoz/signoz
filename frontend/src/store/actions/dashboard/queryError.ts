import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const QueryError = (
	props: QueryErrorProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'QUERY_ERROR',
			payload: {
				errorMessage: props.errorMessage,
				widgetId: props.widgetId,
			},
		});
	};
};

export interface QueryErrorProps {
	errorMessage: string;
	widgetId: string;
}
