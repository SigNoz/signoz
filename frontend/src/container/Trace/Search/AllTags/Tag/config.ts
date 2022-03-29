import getTagValue from 'api/trace/getTagValue';

// Usage of DebounceSelect
export interface TagValue {
	label: string;
	value: string;
}

export async function fetchTag(
	globalStart: number,
	globalEnd: number,
	tagKey: string,
): Promise<TagValue[]> {
	const response = await getTagValue({
		end: globalEnd,
		start: globalStart,
		tagKey,
	});

	if (response.statusCode !== 200 || !response.payload) {
		return [];
	}

	return response.payload.map((e) => ({
		label: e.tagValues,
		value: e.tagValues,
	}));
}
