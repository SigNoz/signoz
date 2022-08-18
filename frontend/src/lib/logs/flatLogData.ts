import { ILog } from 'types/api/logs/log';

export function FlatLogData(log: ILog): Record<string, never> {
	const flattenLogObject: Record<string, never> = {};

	Object.keys(log).forEach((key: keyof ILog): void => {
		if (typeof log[key] !== 'object') {
			flattenLogObject[key] = log[key];
		} else {
			Object.keys(log[key]).forEach((childKey) => {
				flattenLogObject[childKey] = log[key][childKey];
			});
		}
	});
	return flattenLogObject;
}
