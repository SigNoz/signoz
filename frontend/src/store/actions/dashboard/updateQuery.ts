import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UpdateQuery = (
	props: UpdateQueryProps,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'UPDATE_QUERY',
		payload: {
			widgetId: props.widgetId,
			yAxisUnit: props.yAxisUnit,
		},
	});
};

export interface UpdateQueryProps {
	widgetId: string;
	yAxisUnit: string | undefined;
}
