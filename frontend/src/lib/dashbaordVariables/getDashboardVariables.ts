import GetMinMax from 'lib/getMinMax';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import store from 'store';

export const getDashboardVariables = (): Record<string, unknown> => {
	try {
		const {
			globalTime,
			dashboards: { dashboards },
		} = store.getState();
		const [selectedDashboard] = dashboards;
		const {
			data: { variables = {} },
		} = selectedDashboard;

		const minMax = GetMinMax(globalTime.selectedTime, [
			globalTime.minTime / 1000000,
			globalTime.maxTime / 1000000,
		]);

		const { start, end } = GetStartAndEndTime({
			type: 'GLOBAL_TIME',
			minTime: minMax.minTime,
			maxTime: minMax.maxTime,
		});
		const variablesTuple: Record<string, unknown> = {
			SIGNOZ_START_TIME: parseInt(start, 10) * 1e3,
			SIGNOZ_END_TIME: parseInt(end, 10) * 1e3,
		};
		Object.keys(variables).forEach((key) => {
			variablesTuple[key] = variables[key].selectedValue;
		});
		return variablesTuple;
	} catch (e) {
		console.error(e);
	}
	return {};
};
