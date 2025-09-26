import logEvent from 'api/common/logEvent';
import { getSubstituteVars } from 'api/dashboard/substitute_vars';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { useNotifications } from 'hooks/useNotifications';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useMemo } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable, Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

const useCreateAlerts = (
	widget?: Widgets,
	caller?: string,
	thresholds?: ThresholdProps[],
): VoidFunction => {
	const queryRangeMutation = useMutation(getSubstituteVars);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { notifications } = useNotifications();

	const { selectedDashboard } = useDashboard();

	const dynamicVariables = useMemo(
		() =>
			Object.values(selectedDashboard?.data?.variables || {})?.filter(
				(variable: IDashboardVariable) => variable.type === 'DYNAMIC',
			),
		[selectedDashboard],
	);

	return useCallback(() => {
		if (!widget) return;

		if (caller === 'panelView') {
			logEvent('Panel Edit: Create alert', {
				panelType: widget.panelTypes,
				dashboardName: selectedDashboard?.data?.title,
				dashboardId: selectedDashboard?.id,
				widgetId: widget.id,
				queryType: widget.query.queryType,
			});
		} else if (caller === 'dashboardView') {
			logEvent('Dashboard Detail: Panel action', {
				action: MenuItemKeys.CreateAlerts,
				panelType: widget.panelTypes,
				dashboardName: selectedDashboard?.data?.title,
				dashboardId: selectedDashboard?.id,
				widgetId: widget.id,
				queryType: widget.query.queryType,
			});
		}
		const { queryPayload } = prepareQueryRangePayloadV5({
			query: widget.query,
			globalSelectedInterval,
			graphType: getGraphType(widget.panelTypes),
			selectedTime: widget.timePreferance,
			variables: getDashboardVariables(selectedDashboard?.data.variables),
			originalGraphType: widget.panelTypes,
			dynamicVariables,
		});
		queryRangeMutation.mutate(queryPayload, {
			onSuccess: (data) => {
				const updatedQuery = mapQueryDataFromApi(data.data.compositeQuery);
				const url = `${ROUTES.ALERTS_NEW}?${
					QueryParams.compositeQuery
				}=${encodeURIComponent(JSON.stringify(updatedQuery))}&${
					QueryParams.panelTypes
				}=${widget.panelTypes}&version=${ENTITY_VERSION_V5}`;

				history.push(url, {
					thresholds,
				});
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		globalSelectedInterval,
		notifications,
		queryRangeMutation,
		selectedDashboard?.data.variables,
		selectedDashboard?.data.version,
		widget,
		dynamicVariables,
	]);
};

export default useCreateAlerts;
