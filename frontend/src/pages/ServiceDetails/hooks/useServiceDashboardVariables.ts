import { useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import getTopLevelOperations, {
	type ServiceDataProps,
} from 'api/metrics/getTopLevelOperations';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import type { SelectedVariableValue } from 'pages/DashboardPage/DashboardContainer/VariablesBar/selectionTypes';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

interface ServiceDashboardVariables {
	variables: Record<string, SelectedVariableValue>;
	/** The service's saved Apdex threshold T, in seconds. */
	apdexThreshold: number | undefined;
	isLoading: boolean;
}

/**
 * The values the page seeds into every service dashboard: the service and its
 * top-level operations (the span-metric charts filter on them, as V1 did), plus
 * the saved Apdex threshold the page writes into the Apdex queries.
 */
export function useServiceDashboardVariables(
	serviceName: string,
): ServiceDashboardVariables {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const apdex = useGetApDexSettings(serviceName);
	const operations = useQuery<ServiceDataProps>({
		queryKey: ['service-top-level-operations', serviceName, minTime, maxTime],
		queryFn: () =>
			getTopLevelOperations({
				service: serviceName,
				start: minTime,
				end: maxTime,
			}),
		// The window keys the query; keep the list while a new window loads.
		keepPreviousData: true,
	});

	const threshold = apdex.data?.data[0]?.threshold;
	const topLevelOperations = operations.data?.[serviceName];

	const variables = useMemo(() => {
		const seeded: Record<string, SelectedVariableValue> = {
			service_name: serviceName,
		};
		if (topLevelOperations?.length) {
			seeded.top_level_operations = topLevelOperations;
		}
		return seeded;
	}, [serviceName, topLevelOperations]);

	return {
		variables,
		apdexThreshold: threshold,
		isLoading: apdex.isLoading || operations.isLoading,
	};
}
