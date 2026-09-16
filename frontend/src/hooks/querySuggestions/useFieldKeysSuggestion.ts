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
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	FieldKeysFilterConfig,
	FieldKeysResponse,
} from 'api/querySuggestions/types';
import { FieldKeysConfig } from 'types/common/fieldSuggestion';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

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
		queryKey: [
			REACT_QUERY_KEY.FIELD_KEYS_SUGGESTION,
			builderQueryType,
			filterConfig,
		],
		queryFn: ({ signal }): Promise<FieldKeysResponse> =>
			getFieldKeySuggestions(filterConfig, builderQueryType, signal),
		select: toFieldKeys,
		staleTime: FIELD_API_CACHE_TIME,
		cacheTime: FIELD_API_CACHE_TIME,
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
