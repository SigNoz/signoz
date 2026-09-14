import {
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	RenderErrorResponseDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getFieldKeySuggestions } from 'api/querySuggestions/getFieldKeySuggestions';
import {
	FieldKeysFilterConfig,
	FieldKeysResponse,
} from 'api/querySuggestions/types';
import { FieldKeysConfig } from 'types/fieldSuggestions';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

/** One entry per (query type, params) pair; the fetcher picks the endpoint. */
const FIELD_KEYS_QUERY_KEY = 'fieldKeysSuggestion';

export type FieldKeysQueryOptions = UseQueryOptions<
	FieldKeysResponse,
	ErrorType<RenderErrorResponseDTO>,
	TelemetryFieldKey[]
> & { queryKey: QueryKey };

export const toFieldKeys = (
	res: FieldKeysResponse | undefined,
): TelemetryFieldKey[] =>
	Object.values(res?.data?.keys ?? {})
		.flat()
		.map((key) => ({ ...key }) as TelemetryFieldKey);

export const getFieldKeysQueryOptions = (
	{
		builderQueryType,
		fieldContext,
		metricName,
		metricNamespace,
		signalSource,
	}: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): FieldKeysQueryOptions => {
	const filterConfig: FieldKeysFilterConfig = {
		signal: dataSource as unknown as TelemetrytypesSignalDTO,
		searchText,
		fieldContext,
		metricName,
		metricNamespace,
		source: signalSource as TelemetrytypesSourceDTO | undefined,
	};

	return {
		queryKey: [FIELD_KEYS_QUERY_KEY, builderQueryType, filterConfig],
		queryFn: ({ signal }): Promise<FieldKeysResponse> =>
			getFieldKeySuggestions(filterConfig, builderQueryType, signal),
		select: toFieldKeys,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	};
};

export const useFieldKeysSuggestion = (
	config: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): UseQueryResult<TelemetryFieldKey[], ErrorType<RenderErrorResponseDTO>> =>
	useQuery(getFieldKeysQueryOptions(config, dataSource, searchText));
