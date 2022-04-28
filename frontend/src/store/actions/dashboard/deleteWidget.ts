import updateDashboardApi from 'api/dashboard/update';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';

export const DeleteWidget = ({
	widgetId,
}: DeleteWidgetProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { dashboards } = store.getState();
			const [selectedDashboard] = dashboards.dashboards;

			const { widgets = [] } = selectedDashboard.data;
			const updatedWidgets = widgets.filter((e) => e.id !== widgetId);

			const response = await updateDashboardApi({
				data: {
					title: selectedDashboard.data.title,
					description: selectedDashboard.data.description,
					name: selectedDashboard.data.name,
					tags: selectedDashboard.data.tags,
					widgets: updatedWidgets,
				},
				uuid: selectedDashboard.uuid,
			});

			if (response.statusCode === 200) {
				dispatch({
					type: 'DELETE_WIDGET_SUCCESS',
					payload: {
						widgetId,
					},
				});
			} else {
				dispatch({
					type: 'DELETE_WIDGET_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'DELETE_WIDGET_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface DeleteWidgetProps {
	widgetId: Widgets['id'];
}
