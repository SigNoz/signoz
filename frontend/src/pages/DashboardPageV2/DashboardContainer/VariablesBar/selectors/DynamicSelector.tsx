import { useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
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
import { buildExistingDynamicVariableQuery } from '../dynamicFilter';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import { useAutoSelect } from '../useAutoSelect';
import { useVariableFetchState } from '../useVariableFetchState';
import ValueSelector from './ValueSelector';

interface DynamicSelectorProps {
	variable: VariableFormModel;
	/** All variables + current selections, to scope options by sibling dynamics. */
	variables: VariableFormModel[];
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	/** Batched auto-selection fill applied when options resolve. */
	onAutoSelect: (selection: VariableSelection) => void;
}

/**
 * Dynamic-variable options sourced from live telemetry field values for the
 * chosen signal + attribute, scoped by the other dynamic variables' selections
 * (so e.g. `pod` narrows to the chosen `namespace`). WHEN to fetch is owned by
 * the runtime fetch engine: dynamics fetch together once the query variables have
 * values, and refetch (via a `cycleId` bump) whenever any variable value changes.
 */
function DynamicSelector({
	variable,
	variables,
	selections,
	selection,
	onChange,
	onAutoSelect,
}: DynamicSelectorProps): JSX.Element {
	const { minTime, maxTime, isAutoRefreshDisabled } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const existingQuery = useMemo(
		() => buildExistingDynamicVariableQuery(variables, selections, variable.name),
		[variables, selections, variable.name],
	);

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
			'dashboard-variable-dynamic',
			variable.name,
			variable.dynamicSignal,
			variable.dynamicAttribute,
			existingQuery,
			minTime,
			maxTime,
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
				!!variable.dynamicAttribute &&
				(isVariableFetching || (isVariableSettled && hasVariableFetchedOnce)),
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
		const payload = data?.data;
		const values =
			payload?.normalizedValues ?? payload?.values?.StringValues ?? [];
		return sortValuesByOrder(values, variable.sort).map(String);
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

export default DynamicSelector;
