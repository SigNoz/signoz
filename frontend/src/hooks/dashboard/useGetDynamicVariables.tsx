import getDashboard from 'api/dashboard/get';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export interface DynamicVariable extends IDashboardVariable {
	dashboardName: string;
	dashboardId: string;
}

interface UseGetDynamicVariablesProps {
	dashboardId?: string;
}

export const useGetDynamicVariables = (
	props?: UseGetDynamicVariablesProps,
): {
	dynamicVariables: DynamicVariable[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
} => {
	const { dashboardId: dashboardIdFromProps } = props || {};

	const { dashboardId: dashboardIdFromDashboard } = useDashboard();

	const dashboardId = dashboardIdFromProps || dashboardIdFromDashboard;

	const { data: dashboard, isLoading, isError, refetch } = useQuery({
		queryFn: () => getDashboard({ uuid: dashboardId }),
		queryKey: [REACT_QUERY_KEY.DASHBOARD_BY_ID, dashboardId],
	});

	const dynamicVariables = useMemo(() => {
		if (!dashboard?.data?.variables) return [];

		const variables: DynamicVariable[] = [];

		Object.entries(dashboard.data.variables).forEach(([, variable]) => {
			if (variable.type === 'DYNAMIC') {
				variables.push({
					...variable,
					dashboardName: dashboard.data.title,
					dashboardId: dashboard.uuid,
				});
			}
		});

		return variables;
	}, [dashboard]);

	return { dynamicVariables, isLoading, isError, refetch };
};
