import { VariableSelectStrategy } from './variableSelectStrategyTypes';

export const defaultVariableSelectStrategy: VariableSelectStrategy = {
	handleChange({ value, variableData, optionsData, onValueUpdate }) {
		if (!variableData.name) {
			return;
		}

		const isAllSelected =
			Array.isArray(value) &&
			value.length > 0 &&
			optionsData.every((option) => value.includes(option.toString()));

		if (isAllSelected && variableData.showALLOption) {
			onValueUpdate(variableData.name, variableData.id, optionsData, true);
		} else {
			onValueUpdate(variableData.name, variableData.id, value, false);
		}
	},
};
