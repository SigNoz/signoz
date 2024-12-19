import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { PayloadVariables } from 'types/api/dashboard/variables/query';

export function variablePropsToPayloadVariables(
	variables: Record<string, IDashboardVariable>,
): PayloadVariables {
	const payloadVariables: PayloadVariables = {};

	Object.entries(variables).forEach(([, value]) => {
		if (value?.name) {
			payloadVariables[value.name] = value?.selectedValue;
		}
	});

	return payloadVariables;
}
