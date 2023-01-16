import { PayloadProps } from 'types/api/trace/getTagFilters';

// extract tag filters from payload
export const extractTagFilters = (payload: PayloadProps): string[] => {
	const tagFilters: string[] = [];
	payload.stringTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(string)`);
	});
	payload.numberTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(number)`);
	});
	payload.boolTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(bool)`);
	});
	return tagFilters;
};

export const extractTagType = (tagKey: string): string => {
	if (tagKey?.includes('.(string)')) {
		return 'string';
	}
	if (tagKey?.includes('.(number)')) {
		return 'number';
	}
	if (tagKey?.includes('.(bool)')) {
		return 'bool';
	}
	return 'string';
};

export const extractTagKey = (tagKey: string): string => {
	const tag = tagKey.split('.(');
	if (tag && tag.length > 0) {
		return tag[0];
	}
	return '';
};
