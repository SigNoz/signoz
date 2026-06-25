import { useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import { sortValuesByOrder } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import { isResolved, selectionToPayload } from '../selectionUtils';
import { useAutoSelect } from '../useAutoSelect';
import ValueSelector from './ValueSelector';

interface QuerySelectorProps {
	variable: VariableFormModel;
	/** Names this variable's query references; it waits until they're resolved. */
	parents: string[];
	/** All current selections, fed to the query as `{ name: value }`. */
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
}

/**
 * Query-driven options. Dependency orchestration is declarative: the query is
 * `enabled` only once every parent is resolved, and the parent values are in the
 * query key — so it refetches automatically when a parent changes (and a cyclic
 * dependency is simply never enabled).
 */
function QuerySelector({
	variable,
	parents,
	selections,
	selection,
	onChange,
}: QuerySelectorProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const payload = useMemo(() => selectionToPayload(selections), [selections]);
	const enabled = parents.every((parent) => isResolved(selections[parent]));

	const { data, isFetching } = useQuery(
		[
			'dashboard-variable',
			variable.name,
			variable.queryValue,
			payload,
			minTime,
			maxTime,
		],
		() =>
			dashboardVariablesQuery({
				query: variable.queryValue,
				variables: payload,
			}),
		{ enabled, refetchOnWindowFocus: false },
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

	useAutoSelect(variable, options, selection, onChange);

	return (
		<ValueSelector
			options={options}
			multiSelect={variable.multiSelect}
			showAllOption={variable.showAllOption}
			loading={isFetching}
			selection={selection}
			onChange={onChange}
			testId={`variable-select-${variable.name}`}
		/>
	);
}

export default QuerySelector;
