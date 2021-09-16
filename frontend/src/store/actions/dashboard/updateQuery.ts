import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';

export const UpdateQuery = (
	props: UpdateQueryProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		const state = store.getState();
		const dashboards = state.dashboards.dashboards;
		const [selectedDashboard] = dashboards;
		const { data } = selectedDashboard;
		const { widgets = [] } = data;
		const selectedWidgetIndex = widgets.findIndex((e) => e.id === props.widgetId);
		const selectedWidget = widgets[selectedWidgetIndex];
		const { query } = selectedWidget;
		const preQuery = query.slice(0, props.currentIndex);
		const afterQuery = query.slice(props.currentIndex + 1, query.length);
		const queryArray: Query[] = [
			...preQuery,
			{
				query: props.query,
				legend: props.legend,
			},
			...afterQuery,
		];

		dispatch({
			type: 'UPDATE_QUERY',
			payload: {
				query: queryArray,
				widgetId: props.widgetId,
			},
		});
	};
};

export interface UpdateQueryProps {
	widgetId: string;
	query: string;
	legend: string;
	currentIndex: number;
}
