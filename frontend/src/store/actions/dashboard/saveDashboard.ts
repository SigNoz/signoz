import updateDashboardApi from 'api/dashboard/update';
import { AxiosError } from 'axios';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import updateUrl from 'lib/updateUrl';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const SaveDashboard = ({
	uuid,
	description,
	isStacked,
	nullZeroValues,
	opacity,
	timePreferance,
	title,
	widgetId,
	dashboardId,
}: SaveDashboardProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const dashboard = store.getState();

			const selectedDashboard = dashboard.dashboards.dashboards.find(
				(e) => e.uuid === uuid,
			);

			if (selectedDashboard === undefined) {
				throw new Error('Dashboard Not Found');
			}

			const data = selectedDashboard.data;

			const updatedTitle = title;
			const updatedDescription = description;
			const updatedisStacked = isStacked;
			const updatednullZeroValues = nullZeroValues;
			const updatedopacity = opacity;
			const updatedtimePreferance = timePreferance;

			const selectedWidgetIndex = data.widgets?.findIndex(
				(e) => e.id === widgetId,
			);

			const preWidget = data.widgets?.slice(0, selectedWidgetIndex) || [];
			const afterWidget =
				data.widgets?.slice(
					(selectedWidgetIndex || 0) + 1, // this is never undefined
					data.widgets?.length,
				) || [];
			const selectedWidget = (selectedDashboard.data.widgets || [])[
				selectedWidgetIndex || 0
			];

			const response = await updateDashboardApi({
				uuid,
				// this is the data for the dashboard
				title: selectedDashboard.data.title,
				description: selectedDashboard.data.description,
				tags: selectedDashboard.data.tags,
				name: selectedDashboard.data.name,
				// as we are updated the widget only
				widgets: [
					...preWidget,
					{
						...selectedWidget,
						description: updatedDescription,
						id: widgetId,
						isStacked: updatedisStacked,
						nullZeroValues: updatednullZeroValues,
						opacity: updatedopacity,
						title: updatedTitle,
						timePreferance: updatedtimePreferance,
						queryData: {
							...selectedWidget.queryData,
							data: [
								...selectedWidget.queryData.data.map((e) => ({
									...e,
									queryData: [],
								})),
							],
						},
					},
					...afterWidget,
				],
			});

			if (response.statusCode === 200) {
				dispatch({
					type: 'SAVE_SETTING_TO_PANEL_SUCCESS',
					payload: response.payload,
				});
				history.push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', dashboardId));
			} else {
				dispatch({
					type: 'SAVE_SETTING_TO_PANEL_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'SAVE_SETTING_TO_PANEL_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface SaveDashboardProps {
	uuid: Dashboard['uuid'];
	title: Widgets['title'];
	description: Widgets['description'];
	opacity: Widgets['opacity'];
	isStacked: Widgets['isStacked'];
	timePreferance: Widgets['timePreferance'];
	nullZeroValues: Widgets['nullZeroValues'];
	widgetId: Widgets['id'];
	dashboardId: string;
}
