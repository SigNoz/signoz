import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import logEvent from 'api/common/logEvent';
import { getSubstituteVars } from 'api/dashboard/substitute_vars';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';
import { useDashboardVariables } from 'hooks/dashboard/useDashboardVariables';
import { useDashboardVariablesByType } from 'hooks/dashboard/useDashboardVariablesByType';
import { useNotifications } from 'hooks/useNotifications';
import { getDashboardVariables } from 'lib/dashboardVariables/getDashboardVariables';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { isEmpty } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

const useCreateAlerts = (widget?: Widgets, caller?: string): VoidFunction => {
	const queryRangeMutation = useMutation(getSubstituteVars);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { notifications } = useNotifications();

	const { selectedDashboard } = useDashboard();

	const { dashboardVariables } = useDashboardVariables();
	const dashboardDynamicVariables = useDashboardVariablesByType(
		'DYNAMIC',
		'values',
	);

	return useCallback(() => {
		if (!widget) {
			return;
		}

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
			variables: getDashboardVariables(dashboardVariables),
			originalGraphType: widget.panelTypes,
			dynamicVariables: dashboardDynamicVariables,
		});
		queryRangeMutation.mutate(queryPayload, {
			onSuccess: (data) => {
				const updatedQuery = mapQueryDataFromApi(data.data.compositeQuery);
				// If widget has a y-axis unit, set it to the updated query if it is not already set
				if (widget.yAxisUnit && !isEmpty(widget.yAxisUnit)) {
					updatedQuery.unit = widget.yAxisUnit;
				}

				const params = new URLSearchParams();
				params.set(
					QueryParams.compositeQuery,
					encodeURIComponent(JSON.stringify(updatedQuery)),
				);
				params.set(QueryParams.panelTypes, widget.panelTypes);
				params.set(QueryParams.version, ENTITY_VERSION_V5);
				params.set(QueryParams.source, YAxisSource.DASHBOARDS);

				const url = `${ROUTES.ALERTS_NEW}?${params.toString()}`;

				window.open(url, '_blank', 'noreferrer');
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
		dashboardVariables,
		dashboardDynamicVariables,
		selectedDashboard?.data.version,
		widget,
	]);
};

export default useCreateAlerts;
