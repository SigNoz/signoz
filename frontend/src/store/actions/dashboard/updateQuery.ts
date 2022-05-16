import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';

export const UpdateQuery = (
	props: UpdateQueryProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_QUERY',
			payload: {
				query: props.updatedQuery,
				widgetId: props.widgetId,
				yAxisUnit: props.yAxisUnit,
			},
		});
	};
};

export interface UpdateQueryProps {
	widgetId: string;
	query: string;
	legend: string;
	currentIndex: number;
	yAxisUnit: string | undefined;
}
