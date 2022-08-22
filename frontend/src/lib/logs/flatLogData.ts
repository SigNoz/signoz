import { ILog } from 'types/api/logs/log';

export function FlatLogData(log: ILog): Record<string, unknown> {
	const flattenLogObject: Record<string, unknown> = {};

	Object.keys(log).forEach((key: string): void => {
		if (typeof log[key as never] !== 'object') {
			flattenLogObject[key] = log[key as never];
		} else {
			Object.keys(log[key as never]).forEach((childKey) => {
				flattenLogObject[childKey] = log[key as never][childKey];
			});
		}
	});
	return flattenLogObject;
}
