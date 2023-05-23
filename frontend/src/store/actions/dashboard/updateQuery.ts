import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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
	updatedQuery: Query;
	widgetId: string;
	yAxisUnit: string | undefined;
}
