import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import store from 'store';
import { Dashboard } from 'types/api/dashboard/getAll';

export const getDashboardVariables = (
	variables?: Dashboard['data']['variables'],
): Record<string, unknown> => {
	if (!variables) {
		return {};
	}

	try {
		const { globalTime } = store.getState();
		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: globalTime.selectedTime,
		});

		const variablesTuple: Record<string, unknown> = {
			SIGNOZ_START_TIME: parseInt(start, 10) * 1e3,
			SIGNOZ_END_TIME: parseInt(end, 10) * 1e3,
		};

		Object.entries(variables).forEach(([, value]) => {
			if (value?.name) {
				variablesTuple[value.name] = value?.selectedValue;
			}
		});

		return variablesTuple;
	} catch (e) {
		console.error(e);
	}
	return {};
};
