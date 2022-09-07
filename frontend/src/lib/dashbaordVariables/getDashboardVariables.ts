import store from 'store';

export const getDashboardVariables = (): Record<string, unknown> => {
	try {
		const {
			dashboards: { dashboards },
		} = store.getState();
		const [selectedDashboard] = dashboards;
		const {
			data: { variables },
		} = selectedDashboard;

		const variablesTuple: Record<string, unknown> = {};
		Object.keys(variables).forEach((key) => {
			variablesTuple[key] = variables[key].selectedValue;
		});
		return variablesTuple;
	} catch (e) {
		console.error(e);
	}
	return {};
};
