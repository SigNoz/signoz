import { IDashboardVariable } from 'types/api/dashboard/getAll';

export interface VariableSelectStrategy {
	handleChange(params: {
		value: string | string[];
		variableData: IDashboardVariable;
		optionsData: (string | number | boolean)[];
		allAvailableOptionStrings: string[];
		onValueUpdate: (
			name: string,
			id: string,
			value: IDashboardVariable['selectedValue'],
			allSelected: boolean,
			haveCustomValuesSelected?: boolean,
		) => void;
	}): void;
}
