import { IDashboardVariablesStoreState } from './dashboardVariablesStoreTypes';

export type VariableFetchState =
	| 'idle' // stable state - initial or complete
	| 'loading' // actively fetching data (first time)
	| 'revalidating' // refetching existing data
	| 'waiting' // blocked on parent dependencies
	| 'error';

export type VariableFetchContext = Pick<
	IDashboardVariablesStoreState,
	'variableTypes' | 'dynamicVariableOrder' | 'dependencyData'
> & {
	doAllVariablesHaveValuesSelected: boolean;
};
