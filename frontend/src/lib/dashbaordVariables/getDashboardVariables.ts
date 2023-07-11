import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import store from 'store';

export const getDashboardVariables = (): Record<string, unknown> => {
	try {
		const {
			globalTime,
			dashboards: { dashboards },
		} = store.getState();
		if (dashboards.length > 0) {
			const [selectedDashboard] = dashboards || [];
			const {
				data: { variables = {} },
			} = selectedDashboard;

			const { start, end } = getStartEndRangeTime({
				type: 'GLOBAL_TIME',
				interval: globalTime.selectedTime,
			});

			const variablesTuple: Record<string, unknown> = {
				SIGNOZ_START_TIME: parseInt(start, 10) * 1e3,
				SIGNOZ_END_TIME: parseInt(end, 10) * 1e3,
			};
			Object.keys(variables).forEach((key) => {
				variablesTuple[key] = variables[key].selectedValue;
			});
			return variablesTuple;
		}
		return {};
	} catch (e) {
		console.error(e);
	}
	return {};
};
