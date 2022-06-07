import updateDashboardApi from 'api/dashboard/update';
import { AxiosError } from 'axios';
import { getPreLayouts, LayoutProps } from 'container/GridGraphLayout';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { UPDATE_DASHBOARD } from 'types/actions/dashboard';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const DeleteWidget = ({
	widgetId,
	setLayout,
}: DeleteWidgetProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { dashboards } = store.getState();
			const [selectedDashboard] = dashboards.dashboards;

			const { widgets = [] } = selectedDashboard.data;
			const updatedWidgets = widgets.filter((e) => e.id !== widgetId);
			const updatedLayout =
				selectedDashboard.data.layout?.filter((e) => e.i !== widgetId) || [];

			const updatedSelectedDashboard: Dashboard = {
				...selectedDashboard,
				data: {
					title: selectedDashboard.data.title,
					description: selectedDashboard.data.description,
					name: selectedDashboard.data.name,
					tags: selectedDashboard.data.tags,
					widgets: updatedWidgets,
					layout: updatedLayout,
				},
				uuid: selectedDashboard.uuid,
			};

			const response = await updateDashboardApi(updatedSelectedDashboard);

			if (response.statusCode === 200) {
				dispatch({
					type: UPDATE_DASHBOARD,
					payload: updatedSelectedDashboard,
				});
				if (setLayout) {
					setLayout(getPreLayouts(updatedWidgets, updatedLayout));
				}
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
	setLayout?: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
}
