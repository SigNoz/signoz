import { ALL_SELECT_VALUE } from 'container/DashboardContainer/utils';

import { VariableSelectStrategy } from './variableSelectStrategyTypes';

export const dynamicVariableSelectStrategy: VariableSelectStrategy = {
	handleChange({
		value,
		variableData,
		allAvailableOptionStrings,
		onValueUpdate,
	}) {
		if (!variableData.name) {
			return;
		}

		if (
			value === ALL_SELECT_VALUE ||
			(Array.isArray(value) && value.includes(ALL_SELECT_VALUE))
		) {
			onValueUpdate(variableData.name, variableData.id, null, true);
		} else {
			// For ALL selection in dynamic variables, pass null to avoid storing values
			// The parent component will handle this appropriately
			const haveCustomValuesSelected =
				Array.isArray(value) &&
				!value.every((v) => allAvailableOptionStrings.includes(v.toString()));

			onValueUpdate(
				variableData.name,
				variableData.id,
				value,
				allAvailableOptionStrings.every((v) => value.includes(v.toString())),
				haveCustomValuesSelected,
			);
		}
	},
};
