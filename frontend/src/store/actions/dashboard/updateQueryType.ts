import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UpdateQueryType = (
	props: UpdateQueryTypeProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_QUERY_TYPE',
			payload: {
				queryType: props.queryType,
				widgetId: props.widgetId,
			},
		});
	};
};

export interface UpdateQueryTypeProps {
	widgetId: string;
	queryType: number;
}
