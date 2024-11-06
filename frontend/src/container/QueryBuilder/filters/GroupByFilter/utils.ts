import { MetricsType } from 'container/MetricsApplication/constant';
import { isEmpty } from 'lodash-es';

export function removePrefix(str: string, type: string): string {
	const tagPrefix = `${MetricsType.Tag}_`;
	const resourcePrefix = `${MetricsType.Resource}_`;
	const scopePrefix = `${MetricsType.Scope}_`;

	if (str.startsWith(tagPrefix)) {
		return str.slice(tagPrefix.length);
	}
	if (str.startsWith(resourcePrefix)) {
		return str.slice(resourcePrefix.length);
	}
	if (
		str.startsWith(scopePrefix) &&
		!isEmpty(type) &&
		type === MetricsType.Scope
	) {
		return str.slice(scopePrefix.length);
	}

	return str;
}
