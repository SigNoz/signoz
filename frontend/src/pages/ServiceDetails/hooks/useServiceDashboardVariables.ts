import { useMemo } from 'react';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import type { SelectedVariableValue } from 'pages/DashboardPage/DashboardContainer/VariablesBar/selectionTypes';

const NS_PER_SECOND = 1e9;

interface ServiceDashboardVariables {
	variables: Record<string, SelectedVariableValue>;
	isLoading: boolean;
}

/**
 * The values the page seeds into every service dashboard: the service, and the
 * service's saved Apdex threshold (seconds) as T and 4T in nanoseconds.
 */
export function useServiceDashboardVariables(
	serviceName: string,
): ServiceDashboardVariables {
	const { data, isLoading } = useGetApDexSettings(serviceName);
	const threshold = data?.data[0]?.threshold;

	const variables = useMemo(() => {
		const seeded: Record<string, SelectedVariableValue> = {
			service_name: serviceName,
		};
		if (threshold !== undefined) {
			seeded.apdex_threshold_ns = String(threshold * NS_PER_SECOND);
			seeded.apdex_tolerated_ns = String(threshold * 4 * NS_PER_SECOND);
		}
		return seeded;
	}, [serviceName, threshold]);

	return { variables, isLoading };
}
