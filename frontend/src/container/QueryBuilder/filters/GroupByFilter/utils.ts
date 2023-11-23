import { MetricsType } from 'container/MetricsApplication/constant';

export function removePrefix(str: string): string {
	const tagPrefix = `${MetricsType.Tag}_`;
	const resourcePrefix = `${MetricsType.Resource}_`;

	if (str.startsWith(tagPrefix)) {
		return str.slice(tagPrefix.length);
	}
	if (str.startsWith(resourcePrefix)) {
		return str.slice(resourcePrefix.length);
	}
	return str;
}
