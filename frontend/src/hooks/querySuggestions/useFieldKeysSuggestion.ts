import {
	QueryClient,
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { getGetAIObservabilityFieldsKeysQueryOptions } from 'api/generated/services/ai-observability';
import { getGetFieldsKeysQueryOptions } from 'api/generated/services/fields';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	GetFieldsKeys200,
	RenderErrorResponseDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

export interface FieldKeysConfig {
	builderQueryType?: BuilderQueryType;
	fieldContext?: TelemetrytypesFieldContextDTO;
	metricName?: string;
	metricNamespace?: string;
	signalSource?: TelemetrytypesSourceDTO | '';
}

type FieldKeysResponse = GetFieldsKeys200;

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
	const query = {
		select: toFieldKeys,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	} as const;

	if (builderQueryType === 'builder_ai_query') {
		return getGetAIObservabilityFieldsKeysQueryOptions<TelemetryFieldKey[]>(
			{ searchText, fieldContext },
			{ query },
		) as FieldKeysQueryOptions;
	}

	return getGetFieldsKeysQueryOptions<TelemetryFieldKey[]>(
		{
			signal: dataSource as unknown as TelemetrytypesSignalDTO,
			searchText,
			fieldContext,
			metricName,
			metricNamespace,
			source: signalSource as TelemetrytypesSourceDTO | undefined,
		},
		{ query },
	) as FieldKeysQueryOptions;
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
