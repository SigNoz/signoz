import { Dispatch, SetStateAction } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const AllTraceFilterKeyValue = {
	durationNano: 'Duration',
	status: 'Status',
	serviceName: 'Service Name',
	name: 'Operation / Name',
	rpcMethod: 'RPC Method',
	responseStatusCode: 'Status Code',
	httpHost: 'HTTP Host',
	httpMethod: 'HTTP Method',
	httpRoute: 'HTTP Route',
	httpUrl: 'HTTP Url',
	traceID: 'Trace ID',
};

export type AllTraceFilterKeys = keyof typeof AllTraceFilterKeyValue;

// Type for the values of AllTraceFilterKeyValue
export type AllTraceFilterValues = typeof AllTraceFilterKeyValue[AllTraceFilterKeys];

export const AllTraceFilterOptions = Object.keys(
	AllTraceFilterKeyValue,
) as (keyof typeof AllTraceFilterKeyValue)[];

export const statusFilterOption = ['error', 'ok'];

export type FilterType = Record<
	AllTraceFilterKeys,
	{ values: string[]; keys: BaseAutocompleteData }
>;

export const addFilter = (
	filterType: AllTraceFilterKeys,
	value: string,
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>,
	keys?: BaseAutocompleteData[],
): void => {
	setSelectedFilters((prevFilters) => {
		// If previous filters are undefined, initialize them
		if (!prevFilters) {
			return ({
				[filterType]: { values: [value], keys: keys?.[0] },
			} as unknown) as FilterType;
		}
		// If the filter type doesn't exist, initialize it
		if (!prevFilters[filterType]?.values.length) {
			return {
				...prevFilters,
				[filterType]: { values: [value], keys: keys?.[0] },
			};
		}
		// If the value already exists, don't add it again
		if (prevFilters[filterType].values.includes(value)) {
			return prevFilters;
		}
		// Otherwise, add the value to the existing array
		return {
			...prevFilters,
			[filterType]: {
				values: [...prevFilters[filterType].values, value],
				keys: keys?.[0],
			},
		};
	});
};

// Function to remove a filter
export const removeFilter = (
	filterType: AllTraceFilterKeys,
	value: string,
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>,
	keys?: BaseAutocompleteData[],
): void => {
	setSelectedFilters((prevFilters) => {
		if (!prevFilters || !prevFilters[filterType].values.length) {
			return prevFilters;
		}

		const updatedValues = prevFilters[filterType].values.filter(
			(item) => item !== value,
		);

		if (updatedValues.length === 0) {
			const { [filterType]: item, ...remainingFilters } = prevFilters;
			return Object.keys(remainingFilters).length > 0
				? (remainingFilters as FilterType)
				: undefined;
		}

		return {
			...prevFilters,
			[filterType]: { values: updatedValues, keys: keys?.[0] },
		};
	});
};
