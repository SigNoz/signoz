import {
	QueryClient,
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	RenderErrorResponseDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getFieldKeySuggestions } from 'api/querySuggestions/getFieldKeySuggestions';
import {
	FieldKeysFilterConfig,
	FieldKeysResponse,
} from 'api/querySuggestions/types';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

export interface FieldKeysConfig {
	builderQueryType?: BuilderQueryType;
	fieldContext?: TelemetrytypesFieldContextDTO;
	metricName?: string;
	metricNamespace?: string;
	signalSource?: TelemetrytypesSourceDTO | '';
}

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

export const fetchFieldKeys = async (
	queryClient: QueryClient,
	config: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): Promise<TelemetryFieldKey[]> => {
	const { select, ...fetchOptions } = getFieldKeysQueryOptions(
		config,
		dataSource,
		searchText,
	);
	const response = (await queryClient.fetchQuery(
		fetchOptions,
	)) as FieldKeysResponse;

	return select?.(response) ?? toFieldKeys(response);
};
