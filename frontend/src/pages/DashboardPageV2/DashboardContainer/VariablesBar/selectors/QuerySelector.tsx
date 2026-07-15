import { useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from 'constants/queryCacheTime';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import { sortValuesByOrder } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { useDashboardStore } from '../../store/useDashboardStore';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import { selectionToPayload } from '../selectionUtils';
import { useAutoSelect } from '../useAutoSelect';
import { useVariableFetchState } from '../useVariableFetchState';
import ValueSelector from './ValueSelector';

interface QuerySelectorProps {
	variable: VariableFormModel;
	/** All current selections, fed to the query as `{ name: value }`. */
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	/** Batched auto-selection fill applied when options resolve. */
	onAutoSelect: (selection: VariableSelection) => void;
}

/**
 * Query-driven options. WHEN to fetch is owned by the runtime fetch engine
 * (`variableFetchSlice`): the query is `enabled` while this variable is fetching
 * (or settled-after-a-first-fetch, so a cycle bump re-runs it), and the engine's
 * per-variable `cycleId` keys the request — so a parent's value change refetches
 * only the dependent variables, in dependency order. The current selections feed
 * the request payload but are deliberately NOT in the key (V1 parity).
 */
function QuerySelector({
	variable,
	selections,
	selection,
	onChange,
	onAutoSelect,
}: QuerySelectorProps): JSX.Element {
	const { minTime, maxTime, isAutoRefreshDisabled } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const payload = useMemo(() => selectionToPayload(selections), [selections]);

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

	const { data, isFetching, error, refetch } = useQuery(
		[
			'dashboard-variable',
			variable.name,
			variable.queryValue,
			minTime,
			maxTime,
			variableFetchCycleId,
		],
		() =>
			dashboardVariablesQuery({
				query: variable.queryValue,
				variables: payload,
			}),
		{
			enabled: isVariableFetching || (isVariableSettled && hasVariableFetchedOnce),
			refetchOnWindowFocus: false,
			// Each cycle mints a fresh key; 0 under auto-refresh so entries don't pile up (V1 parity).
			cacheTime: isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			onSettled: (_, error) =>
				error
					? onVariableFetchFailure(variable.name)
					: onVariableFetchComplete(variable.name),
		},
	);

	const options = useMemo(() => {
		if (!data || data.statusCode !== 200 || !data.payload) {
			return [] as string[];
		}
		return sortValuesByOrder(
			data.payload.variableValues ?? [],
			variable.sort,
		).map(String);
	}, [data, variable.sort]);

	useAutoSelect(variable, options, selection, onAutoSelect);

	return (
		<ValueSelector
			options={options}
			multiSelect={variable.multiSelect}
			showAllOption={variable.showAllOption}
			loading={isFetching || isVariableWaiting}
			errorMessage={error ? (error as Error).message || null : null}
			onRetry={(): void => {
				void refetch();
			}}
			selection={selection}
			onChange={onChange}
			testId={`variable-select-${variable.name}`}
		/>
	);
}

export default QuerySelector;
