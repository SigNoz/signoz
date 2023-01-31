import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';

export const UpdateQuery = (
	props: UpdateQueryProps,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'UPDATE_QUERY',
		payload: {
			query: props.updatedQuery,
			widgetId: props.widgetId,
			yAxisUnit: props.yAxisUnit,
		},
	});
};

export interface UpdateQueryProps {
	// query: string;
	// legend: string;
	// currentIndex: number;
	updatedQuery: Query;
	widgetId: string;
	yAxisUnit: string | undefined;
}
