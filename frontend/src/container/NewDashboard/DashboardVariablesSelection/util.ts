import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';

export function areArraysEqual(
	a: (string | number | boolean)[],
	b: (string | number | boolean)[],
): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

export const convertVariablesToDbFormat = (
	variblesArr: IDashboardVariable[],
): Dashboard['data']['variables'] =>
	variblesArr.reduce((result, obj: IDashboardVariable) => {
		const { id } = obj;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		result[id] = obj;
		return result;
	}, {});
