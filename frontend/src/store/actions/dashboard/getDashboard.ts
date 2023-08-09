import getDashboard from 'api/dashboard/get';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Props } from 'types/api/dashboard/get';

export const GetDashboard = ({
	uuid,
	widgetId,
	graphType,
}: GetDashboardProps): ((dispatch: Dispatch<AppActions>) => void) => async (
	dispatch: Dispatch<AppActions>,
): Promise<void> => {
	try {
		dispatch({
			type: 'GET_DASHBOARD_LOADING_START',
		});

		const response = await getDashboard({
			uuid,
		});

		if (response.statusCode === 200) {
			dispatch({
				payload: response.payload,
				type: 'GET_DASHBOARD_SUCCESS',
			});

			if (widgetId !== undefined) {
				dispatch({
					type: 'CREATE_DEFAULT_WIDGET',
					payload: {
						description: '',
						id: widgetId,
						isStacked: false,
						nullZeroValues: 'zero',
						opacity: '0',
						panelTypes: graphType || PANEL_TYPES.TIME_SERIES,
						timePreferance: 'GLOBAL_TIME',
						title: '',
						query: initialQueriesMap.metrics,
					},
				});
			}
		} else {
			dispatch({
				type: 'GET_DASHBOARD_ERROR',
				payload: {
					errorMessage: response.error || 'Something went wrong',
				},
			});
		}
	} catch (error) {
		dispatch({
			type: 'GET_DASHBOARD_ERROR',
			payload: {
				errorMessage:
					error instanceof Error ? error.toString() : 'Something went wrong',
			},
		});
	}
};

export interface GetDashboardProps {
	uuid: Props['uuid'];
	widgetId?: string;
	graphType?: PANEL_TYPES;
}
