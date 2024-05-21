import { defaultTo } from 'lodash-es';
import { ILog } from 'types/api/logs/log';

export function FlatLogData(log: ILog): Record<string, string> {
	const flattenLogObject: Record<string, string> = {};

	Object.keys(log).forEach((key: string): void => {
		if (typeof log[key as never] !== 'object') {
			flattenLogObject[key] = log[key as never];
		} else {
			Object.keys(defaultTo(log[key as never], {})).forEach((childKey) => {
				flattenLogObject[childKey] = log[key as never][childKey];
			});
		}
	});
	return flattenLogObject;
}
