import { Dispatch, SetStateAction } from 'react';
import { AllTraceFilterKeys } from 'constants/traceFilterKeys';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

export type FilterType = Record<
	AllTraceFilterKeys,
	{ values: string[] | string; keys: BaseAutocompleteData }
>;

export interface HandleRunProps {
	resetAll?: boolean;
	clearByType?: AllTraceFilterKeys;
}

function convertToStringArr(value: string | string[] | undefined): string[] {
	if (value) {
		if (typeof value === 'string') {
			return [value];
		}
		return value;
	}
	return [];
}

export const addFilter = (
	filterType: AllTraceFilterKeys,
	value: string,
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[] | string; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>,
	keys: BaseAutocompleteData,
): void => {
	setSelectedFilters((prevFilters) => {
		const isDuration = [
			'durationNanoMax',
			'durationNanoMin',
			'durationNano',
		].includes(filterType);

		// Convert value to string array
		const valueArray = convertToStringArr(value);

		// If previous filters are undefined, initialize them
		if (!prevFilters) {
			return {
				[filterType]: { values: isDuration ? value : valueArray, keys },
			} as unknown as FilterType;
		}

		// If the filter type doesn't exist, initialize it
		if (!prevFilters[filterType]?.values.length) {
			return {
				...prevFilters,
				[filterType]: { values: isDuration ? value : valueArray, keys },
			};
		}

		// If the value already exists, don't add it again
		if (convertToStringArr(prevFilters[filterType].values).includes(value)) {
			return prevFilters;
		}

		// Otherwise, add the value to the existing array
		return {
			...prevFilters,
			[filterType]: {
				values: isDuration
					? value
					: [...convertToStringArr(prevFilters[filterType].values), value],
				keys,
			},
		};
	});
};

/** Merges two filter lists; later items win on the same key + operator. */
export function unionTagFilterItems(
	items1: TagFilterItem[],
	items2: TagFilterItem[],
): TagFilterItem[] {
	const unionMap = new Map<string, TagFilterItem>();

	items1?.forEach((item) => {
		const keyOp = `${item?.key?.key}_${item?.op}`;
		unionMap.set(keyOp, item);
	});

	items2?.forEach((item) => {
		const keyOp = `${item?.key?.key}_${item?.op}`;
		unionMap.set(keyOp, item);
	});

	return Array.from(unionMap?.values());
}
