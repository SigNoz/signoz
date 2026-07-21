import { useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from 'constants/queryCacheTime';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import {
	signalForApi,
	sortValuesByOrder,
} from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { useDashboardStore } from '../../store/useDashboardStore';
import { buildExistingDynamicVariableQuery } from '../utils/dynamicFilter';
import type { VariableSelectionMap } from '../selectionTypes';
import { selectionToPayload } from '../utils/selectionUtils';
import { useVariableFetchState } from './useVariableFetchState';

export interface VariableOptions {
	options: string[];
	loading: boolean;
	errorMessage: string | null;
	onRetry?: () => void;
}

/**
 * Options + loading/error state for a FETCHED list variable (QUERY / DYNAMIC),
 * owned by the fetch engine: `enabled` gated on the variable's fetch state, keyed
 * by `cycleId`, never by the current selections or time — those feed the fetchers
 * (which read the current time at call), so the debounced fetch cycle drives
 * refetches. CUSTOM/TEXT never fetch here (the queries stay disabled).
 */
export function useFetchedVariableOptions(
	variable: VariableFormModel,
	variables: VariableFormModel[],
	selections: VariableSelectionMap,
): VariableOptions {
	const { minTime, maxTime, isAutoRefreshDisabled } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	// Bound cache churn: 0 under auto-refresh so entries don't pile up (V1 parity).
	const cacheTime = isAutoRefreshDisabled
		? DASHBOARD_CACHE_TIME
		: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED;
	const {
		variableFetchCycleId,
		isVariableFetching,
		isVariableSettled,
		isVariableWaiting,
		hasVariableFetchedOnce,
	} = useVariableFetchState(variable.name);
	const onVariableFetchComplete = useDashboardStore(
		(s) => s.onVariableFetchComplete,
	);
	const onVariableFetchFailure = useDashboardStore(
		(s) => s.onVariableFetchFailure,
	);
	const setVariableResolvedEmpty = useDashboardStore(
		(s) => s.setVariableResolvedEmpty,
	);

	// Fetch while this variable is actively fetching, or once settled after a first
	// fetch (so a `cycleId` bump re-runs it). Combined with a per-type guard below.
	const canFetch =
		isVariableFetching || (isVariableSettled && hasVariableFetchedOnce);

	// QUERY — options from the test-run endpoint; selections feed the payload, not the key.
	const payload = useMemo(() => selectionToPayload(selections), [selections]);
	const queryResult = useQuery(
		[
			'dashboard-variable',
			variable.name,
			variable.queryValue,
			variableFetchCycleId,
		],
		() =>
			dashboardVariablesQuery({
				query: variable.queryValue,
				variables: payload,
			}),
		{
			enabled: variable.type === 'QUERY' && canFetch,
			refetchOnWindowFocus: false,
			cacheTime,
			onSettled: (_, error) =>
				error
					? onVariableFetchFailure(variable.name)
					: onVariableFetchComplete(variable.name),
		},
	);

	// DYNAMIC — telemetry field values scoped by sibling dynamics via `existingQuery`
	// (fed to the fetcher only, not the key — see DynamicSelector history).
	const existingQuery = useMemo(
		() => buildExistingDynamicVariableQuery(variables, selections, variable.name),
		[variables, selections, variable.name],
	);
	const dynamicResult = useQuery(
		[
			'dashboard-variable-dynamic',
			variable.name,
			variable.dynamicSignal,
			variable.dynamicAttribute,
			variableFetchCycleId,
		],
		() =>
			getFieldValues(
				signalForApi(variable.dynamicSignal),
				variable.dynamicAttribute,
				undefined,
				minTime,
				maxTime,
				existingQuery || undefined,
			),
		{
			enabled:
				variable.type === 'DYNAMIC' && !!variable.dynamicAttribute && canFetch,
			refetchOnWindowFocus: false,
			cacheTime,
			onSettled: (_, error) =>
				error
					? onVariableFetchFailure(variable.name)
					: onVariableFetchComplete(variable.name),
		},
	);

	const queryOptions = useMemo(() => {
		const data = queryResult.data;
		if (!data || data.statusCode !== 200 || !data.payload) {
			return [] as string[];
		}
		return sortValuesByOrder(
			data.payload.variableValues ?? [],
			variable.sort,
		).map(String);
	}, [queryResult.data, variable.sort]);

	const dynamicOptions = useMemo(() => {
		const data = dynamicResult.data?.data;
		const values = data?.normalizedValues ?? data?.values?.StringValues ?? [];
		return sortValuesByOrder(values, variable.sort).map(String);
	}, [dynamicResult.data, variable.sort]);

	// Flag a variable that settled with zero options so dependent panels fall through
	// to "no data" instead of waiting forever. hasFetchedOnce excludes the pre-fetch state.
	const effectiveOptions =
		variable.type === 'DYNAMIC' ? dynamicOptions : queryOptions;
	useEffect(() => {
		if (variable.type !== 'QUERY' && variable.type !== 'DYNAMIC') {
			return;
		}
		setVariableResolvedEmpty(
			variable.name,
			hasVariableFetchedOnce &&
				!isVariableFetching &&
				effectiveOptions.length === 0,
		);
	}, [
		variable.type,
		variable.name,
		hasVariableFetchedOnce,
		isVariableFetching,
		effectiveOptions.length,
		setVariableResolvedEmpty,
	]);

	if (variable.type === 'DYNAMIC') {
		return {
			options: dynamicOptions,
			loading: dynamicResult.isFetching || isVariableWaiting,
			errorMessage: dynamicResult.error
				? (dynamicResult.error as Error).message || null
				: null,
			onRetry: (): void => {
				void dynamicResult.refetch();
			},
		};
	}
	return {
		options: queryOptions,
		loading: queryResult.isFetching || isVariableWaiting,
		errorMessage: queryResult.error
			? (queryResult.error as Error).message || null
			: null,
		onRetry: (): void => {
			void queryResult.refetch();
		},
	};
}
