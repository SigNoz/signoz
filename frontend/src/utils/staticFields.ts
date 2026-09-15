import { TelemetryFieldKey } from 'types/api/v5/queryRange';

/** Manual fields the keys endpoint never returns; the caller owns them, not the fetch. */
export const mergeStaticFields = (
	statics: TelemetryFieldKey[] = [],
	fetched: TelemetryFieldKey[],
	searchText: string,
): TelemetryFieldKey[] => {
	const search = searchText.trim().toLowerCase();
	const staticNames = new Set(statics.map((field) => field.name));

	return [
		...statics.filter((field) => field.name.toLowerCase().includes(search)),
		...fetched.filter((field) => !staticNames.has(field.name)),
	];
};
