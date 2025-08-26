/* eslint-disable react-hooks/exhaustive-deps */
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY } from 'constants/queryBuilder';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export const AllTraceFilterKeyValue: Record<string, string> = {
	durationNanoMin: 'Duration',
	durationNano: 'Duration',
	duration_nano: 'Duration',
	durationNanoMax: 'Duration',
	'deployment.environment': 'Environment',
	hasError: 'Status',
	has_error: 'Status',
	serviceName: 'Service Name',
	'service.name': 'service.name',
	name: 'Operation / Name',
	rpcMethod: 'RPC Method',
	'rpc.method': 'RPC Method',
	responseStatusCode: 'Status Code',
	response_status_code: 'Status Code',
	httpHost: 'HTTP Host',
	http_host: 'HTTP Host',
	httpMethod: 'HTTP Method',
	http_method: 'HTTP Method',
	httpRoute: 'HTTP Route',
	'http.route': 'HTTP Route',
	httpUrl: 'HTTP URL',
	'http.url': 'HTTP URL',
	traceID: 'Trace ID',
	trace_id: 'Trace ID',
} as const;

export type AllTraceFilterKeys = keyof typeof AllTraceFilterKeyValue;

// Type for the values of AllTraceFilterKeyValue
export type AllTraceFilterValues = typeof AllTraceFilterKeyValue[AllTraceFilterKeys];

export const AllTraceFilterOptions = Object.keys(
	AllTraceFilterKeyValue,
) as (keyof typeof AllTraceFilterKeyValue)[];

export const statusFilterOption = ['Error', 'Ok'];

export type FilterType = Record<
	AllTraceFilterKeys,
	{ values: string[] | string; keys: BaseAutocompleteData }
>;

export function convertToStringArr(
	value: string | string[] | undefined,
): string[] {
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
			return ({
				[filterType]: { values: isDuration ? value : valueArray, keys },
			} as unknown) as FilterType;
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

// Function to remove a filter
export const removeFilter = (
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
		if (!prevFilters || !prevFilters[filterType]?.values.length) {
			return prevFilters;
		}

		const prevValue = convertToStringArr(prevFilters[filterType]?.values);
		const updatedValues = prevValue.filter((item: any) => item !== value);

		if (updatedValues.length === 0) {
			const { [filterType]: item, ...remainingFilters } = prevFilters;
			return Object.keys(remainingFilters).length > 0
				? (remainingFilters as FilterType)
				: undefined;
		}

		return {
			...prevFilters,
			[filterType]: { values: updatedValues, keys },
		};
	});
};

export const removeAllFilters = (
	filterType: AllTraceFilterKeys,
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>,
): void => {
	setSelectedFilters((prevFilters) => {
		if (!prevFilters || !prevFilters[filterType]) {
			return prevFilters;
		}

		const { [filterType]: item, ...remainingFilters } = prevFilters;

		return Object.keys(remainingFilters).length > 0
			? (remainingFilters as Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >)
			: undefined;
	});
};

export const traceFilterKeys: Record<
	AllTraceFilterKeys,
	BaseAutocompleteData
> = {
	durationNano: {
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
		id: 'durationNano--float64--tag--true',
	},
	hasError: {
		key: 'hasError',
		dataType: DataTypes.bool,
		type: 'tag',
		id: 'hasError--bool--tag--true',
	},
	serviceName: {
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'serviceName--string--tag--true',
	},

	'deployment.environment': {
		key: 'deployment.environment',
		dataType: DataTypes.String,
		type: 'resource',
		id: 'deployment.environment--string--resource--false',
	},
	name: {
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'name--string--tag--true',
	},
	rpcMethod: {
		key: 'rpcMethod',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'rpcMethod--string--tag--true',
	},
	responseStatusCode: {
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'responseStatusCode--string--tag--true',
	},
	httpHost: {
		key: 'httpHost',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'httpHost--string--tag--true',
	},
	httpMethod: {
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'httpMethod--string--tag--true',
	},
	httpRoute: {
		key: 'httpRoute',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'httpRoute--string--tag--true',
	},
	httpUrl: {
		key: 'httpUrl',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'httpUrl--string--tag--true',
	},
	traceID: {
		key: 'traceID',
		dataType: DataTypes.String,
		type: 'tag',
		id: 'traceID--string--tag--true',
	},
	durationNanoMin: {
		key: 'durationNanoMin',
		dataType: DataTypes.Float64,
		type: 'tag',
		id: 'durationNanoMin--float64--tag--true',
	},
	durationNanoMax: {
		key: 'durationNanoMax',
		dataType: DataTypes.Float64,
		type: 'tag',
		id: 'durationNanoMax--float64--tag--true',
	},
} as const;

interface AggregateValuesProps {
	value: AllTraceFilterKeys;
	searchText?: string;
}

type IuseGetAggregateValue = {
	keys: BaseAutocompleteData;
	results: string[];
	isFetching: boolean;
};

export function useGetAggregateValues(
	props: AggregateValuesProps,
): IuseGetAggregateValue {
	const { value, searchText } = props;
	const keyData = traceFilterKeys[value];
	const [isFetching, setFetching] = useState<boolean>(true);
	const [results, setResults] = useState<string[]>([]);

	const getValues = async (): Promise<void> => {
		try {
			setResults([]);
			const { payload } = await getAttributesValues({
				aggregateOperator: 'noop',
				dataSource: DataSource.TRACES,
				aggregateAttribute: '',
				attributeKey: value,
				filterAttributeKeyDataType: keyData ? keyData.dataType : DataTypes.EMPTY,
				tagType: keyData.type ?? '',
				searchText: searchText ?? '',
			});

			if (payload) {
				const key =
					DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY[keyData.dataType as Partial<DataTypes>];
				setResults(key ? payload[key] || [] : []);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setFetching(false);
		}
	};

	useEffect(() => {
		getValues();
	}, [searchText]);

	if (!value) {
		setFetching(false);
		return { keys: keyData, results, isFetching };
	}

	return { keys: keyData, results, isFetching };
}

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

export interface HandleRunProps {
	resetAll?: boolean;
	clearByType?: AllTraceFilterKeys;
}
