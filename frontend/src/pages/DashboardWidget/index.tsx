import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { generatePath, useParams } from 'react-router-dom';
import { Card, Typography } from 'antd';
import getDashboard from 'api/v1/dashboards/id/get';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DASHBOARD_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { ALL_SELECTED_VALUE } from 'container/CreateAlertV2/constants';
import NewWidget from 'container/NewWidget';
import { isDrilldownEnabled } from 'container/QueryTable/Drilldown/drilldownUtils';
import { useDashboardVariablesFromLocalStorage } from 'hooks/dashboard/useDashboardFromLocalStorage';
import useVariablesFromUrl from 'hooks/dashboard/useVariablesFromUrl';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isEmpty } from 'lodash-es';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import { normalizeUrlValueForVariable } from 'providers/Dashboard/normalizeUrlValue';
import { setDashboardVariablesStore } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { v4 as generateUUID } from 'uuid';

function DashboardWidget(): JSX.Element | null {
	const { dashboardId } = useParams<{
		dashboardId: string;
	}>();
	const [widgetId] = useQueryState('widgetId');
	const [graphType] = useQueryState(
		'graphType',
		parseAsStringEnum<PANEL_TYPES>(Object.values(PANEL_TYPES)),
	);

	const { safeNavigate } = useSafeNavigate();

	useEffect(() => {
		if (!graphType || !widgetId) {
			safeNavigate(generatePath(ROUTES.DASHBOARD, { dashboardId }));
		} else if (!dashboardId) {
			safeNavigate(ROUTES.HOME);
		}
	}, [graphType, widgetId, dashboardId, safeNavigate]);

	if (!widgetId || !graphType) {
		return null;
	}

	return (
		<DashboardWidgetInternal
			dashboardId={dashboardId}
			widgetId={widgetId}
			graphType={graphType}
		/>
	);
}

function DashboardWidgetInternal({
	dashboardId,
	widgetId,
	graphType,
}: {
	dashboardId: string;
	widgetId: string;
	graphType: PANEL_TYPES;
}): JSX.Element | null {
	const [selectedDashboard, setSelectedDashboard] = useState<
		Dashboard | undefined
	>(undefined);

	const { currentDashboard } = useDashboardVariablesFromLocalStorage(
		dashboardId,
	);

	const { getUrlVariables } = useVariablesFromUrl();

	const mergeDBWithLocalStorage = (
		data: Dashboard,
		localStorageVariables: any,
	): Dashboard => {
		const updatedData = data;
		if (data && localStorageVariables) {
			const updatedVariables = data.data.variables;
			const variablesFromUrl = getUrlVariables();
			Object.keys(data.data.variables).forEach((variable) => {
				const variableData = data.data.variables[variable];

				// values from url
				const urlVariable = variableData?.name
					? variablesFromUrl[variableData?.name] || variablesFromUrl[variableData.id]
					: variablesFromUrl[variableData.id];

				let updatedVariable = {
					...data.data.variables[variable],
					...localStorageVariables[variableData.name as any],
				};

				// respect the url variable if it is set, override the others
				if (!isEmpty(urlVariable)) {
					if (urlVariable === ALL_SELECTED_VALUE) {
						updatedVariable = {
							...updatedVariable,
							allSelected: true,
						};
					} else {
						// Normalize URL value to match variable's multiSelect configuration
						const normalizedValue = normalizeUrlValueForVariable(
							urlVariable,
							variableData,
						);

						updatedVariable = {
							...updatedVariable,
							selectedValue: normalizedValue,
							// Only set allSelected to false if showALLOption is available
							...(updatedVariable?.showALLOption && { allSelected: false }),
						};
					}
				}

				updatedVariables[variable] = updatedVariable;
			});
			updatedData.data.variables = updatedVariables;
		}
		return updatedData;
	};

	// As we do not have order and ID's in the variables object, we have to process variables to add order and ID if they do not exist in the variables object
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const transformDashboardVariables = (data: Dashboard): Dashboard => {
		if (data && data.data && data.data.variables) {
			const clonedDashboardData = mergeDBWithLocalStorage(
				JSON.parse(JSON.stringify(data)),
				currentDashboard,
			);
			const { variables } = clonedDashboardData.data;
			const existingOrders: Set<number> = new Set();

			for (const key in variables) {
				// eslint-disable-next-line no-prototype-builtins
				if (variables.hasOwnProperty(key)) {
					const variable: IDashboardVariable = variables[key];

					// Check if 'order' property doesn't exist or is undefined
					if (variable.order === undefined) {
						// Find a unique order starting from 0
						let order = 0;
						while (existingOrders.has(order)) {
							order += 1;
						}

						variable.order = order;
						existingOrders.add(order);
						// ! BWC - Specific case for backward compatibility where textboxValue was used instead of defaultValue
						if (variable.type === 'TEXTBOX' && !variable.defaultValue) {
							variable.defaultValue = variable.textboxValue || '';
						}
					}

					if (variable.id === undefined) {
						variable.id = generateUUID();
					}
				}
			}

			return clonedDashboardData;
		}

		return data;
	};

	const {
		isFetching: isFetchingDashboardResponse,
		isError: isErrorDashboardResponse,
	} = useQuery([REACT_QUERY_KEY.DASHBOARD_BY_ID, dashboardId, widgetId], {
		enabled: true,
		queryFn: async () =>
			await getDashboard({
				id: dashboardId,
			}),
		refetchOnWindowFocus: false,
		cacheTime: DASHBOARD_CACHE_TIME,
		onSuccess: (response) => {
			const updatedDashboardData = transformDashboardVariables(response.data);
			setSelectedDashboard(updatedDashboardData);
			setDashboardVariablesStore({
				dashboardId,
				variables: updatedDashboardData.data.variables,
			});
		},
	});

	if (isFetchingDashboardResponse) {
		return <Spinner tip="Loading.." />;
	}

	if (isErrorDashboardResponse) {
		return (
			<Card>
				<Typography>{SOMETHING_WENT_WRONG}</Typography>
			</Card>
		);
	}

	return (
		<NewWidget
			dashboardId={dashboardId}
			selectedGraph={graphType}
			enableDrillDown={isDrilldownEnabled()}
			selectedDashboard={selectedDashboard}
		/>
	);
}
export default DashboardWidget;
