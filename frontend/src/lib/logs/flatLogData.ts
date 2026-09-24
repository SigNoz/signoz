import { defaultTo } from 'lodash-es';
import { ILog, ILogBody } from 'types/api/logs/log';

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

function getBodyFieldValue(body: ILogBody, key: string): unknown {
	return key.split('.').reduce<unknown>((acc, segment) => {
		if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
			return (acc as Record<string, unknown>)[segment];
		}
		return undefined;
	}, body);
}

// Resolve one field for the logs table. A JSON body is checked first (use_json_body
// only), splitting the key on `.`; otherwise fall back to FlatLogData
// (attributes/resources/scope/top-level).
export function getLogFieldValue(
	log: ILog,
	fieldName: string,
	isBodyJsonEnabled: boolean,
): unknown {
	if (isBodyJsonEnabled && log.body && typeof log.body === 'object') {
		const bodyValue = getBodyFieldValue(log.body, fieldName);
		if (bodyValue !== undefined) {
			return bodyValue;
		}
	}
	return FlatLogData(log)[fieldName];
}
