import { VariableItemProps } from '../VariableItem';

export interface VariableSelectStrategy {
	handleChange(params: {
		value: string | string[];
		variableData: VariableItemProps['variableData'];
		onValueUpdate: VariableItemProps['onValueUpdate'];
		optionsData: (string | number | boolean)[];
		allAvailableOptionStrings: string[];
	}): void;
}
